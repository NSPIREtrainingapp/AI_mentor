import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// QuickBooks OAuth callback handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const realmId = searchParams.get('realmId'); // QuickBooks Company ID
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/dashboard?error=quickbooks_auth_failed');
  }

  if (!code || !realmId) {
    return NextResponse.redirect('/dashboard?error=missing_auth_data');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI!,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received from QuickBooks');
    }

    // Store tokens and company info securely
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.auth.updateUser({
        data: {
          quickbooks_access_token: tokens.access_token,
          quickbooks_refresh_token: tokens.refresh_token,
          quickbooks_realm_id: realmId,
          quickbooks_connected: true,
          quickbooks_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        }
      });

      // Immediately sync financial data
      await syncQuickBooksData(user.id, tokens.access_token, realmId);
    }

    return NextResponse.redirect('/dashboard?success=quickbooks_connected');
  } catch (error) {
    console.error('QuickBooks auth error:', error);
    return NextResponse.redirect('/dashboard?error=quickbooks_connection_failed');
  }
}

// Initiate QuickBooks OAuth flow
export async function POST() {
  const quickbooksAuthUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
  
  quickbooksAuthUrl.searchParams.set('client_id', process.env.QUICKBOOKS_CLIENT_ID!);
  quickbooksAuthUrl.searchParams.set('scope', process.env.QUICKBOOKS_SCOPE!);
  quickbooksAuthUrl.searchParams.set('redirect_uri', process.env.QUICKBOOKS_REDIRECT_URI!);
  quickbooksAuthUrl.searchParams.set('response_type', 'code');
  quickbooksAuthUrl.searchParams.set('access_type', 'offline');

  return NextResponse.json({ authUrl: quickbooksAuthUrl.toString() });
}

async function syncQuickBooksData(userId: string, accessToken: string, realmId: string) {
  try {
    const baseUrl = 'https://sandbox-quickbooks.api.intuit.com'; // Use production URL for live data
    
    // Fetch recent expenses (last 90 days)
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get expenses
    const expensesResponse = await fetch(
      `${baseUrl}/v3/company/${realmId}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${new Date().toISOString().split('T')[0]}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    const expensesData = await expensesResponse.json();

    // Get individual purchase transactions
    const purchasesResponse = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=SELECT * FROM Purchase WHERE TxnDate >= '${startDate}' MAXRESULTS 100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    const purchasesData = await purchasesResponse.json();

    // Process expense data
    if (purchasesData.QueryResponse?.Purchase) {
      for (const purchase of purchasesData.QueryResponse.Purchase) {
        const amount = parseFloat(purchase.TotalAmt || 0);
        const date = purchase.TxnDate;
        const month = date.substring(0, 7); // YYYY-MM
        
        // Process each line item
        if (purchase.Line) {
          for (const line of purchase.Line) {
            if (line.DetailType === 'AccountBasedExpenseLineDetail' && line.Amount > 0) {
              const category = mapQuickBooksAccount(line.AccountBasedExpenseLineDetail?.AccountRef?.name || 'Other');
              
              // Store transaction
              await supabase
                .from('transactions')
                .upsert({
                  user_id: userId,
                  account_id: 'quickbooks',
                  transaction_id: `qb_${purchase.Id}_${line.Id}`,
                  amount: parseFloat(line.Amount),
                  description: line.Description || purchase.PrivateNote || 'QuickBooks Expense',
                  category: category,
                  date: date,
                  account_name: 'QuickBooks',
                  merchant: purchase.EntityRef?.name || 'Unknown',
                }, {
                  onConflict: 'transaction_id'
                });

              // Update budget category
              await updateBudgetCategory(userId, category, parseFloat(line.Amount), month);
            }
          }
        }
      }
    }

    // Get income data for cash flow analysis
    const incomeResponse = await fetch(
      `${baseUrl}/v3/company/${realmId}/query?query=SELECT * FROM Invoice WHERE TxnDate >= '${startDate}' MAXRESULTS 100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    const incomeData = await incomeResponse.json();

    // Process income data (for business users)
    if (incomeData.QueryResponse?.Invoice) {
      let totalIncome = 0;
      const currentMonth = new Date().toISOString().substring(0, 7);
      
      for (const invoice of incomeData.QueryResponse.Invoice) {
        if (invoice.TxnDate.startsWith(currentMonth)) {
          totalIncome += parseFloat(invoice.TotalAmt || 0);
        }
      }

      // Store income as a "budget category" for tracking
      if (totalIncome > 0) {
        await supabase
          .from('budget_categories')
          .upsert({
            user_id: userId,
            name: 'Business Income',
            month: currentMonth,
            target_amount: totalIncome, // Income is "target"
            spent_amount: 0, // Not spent, it's earned
          }, {
            onConflict: 'user_id,name,month'
          });
      }
    }

  } catch (error) {
    console.error('QuickBooks data sync error:', error);
  }
}

function mapQuickBooksAccount(accountName: string): string {
  const name = accountName.toLowerCase();
  
  // Map QuickBooks accounts to budget categories
  if (name.includes('office') || name.includes('supplies')) {
    return 'Office & Supplies';
  } else if (name.includes('travel') || name.includes('meals') || name.includes('entertainment')) {
    return 'Travel & Entertainment';
  } else if (name.includes('advertising') || name.includes('marketing')) {
    return 'Marketing';
  } else if (name.includes('utilities') || name.includes('phone') || name.includes('internet')) {
    return 'Utilities';
  } else if (name.includes('rent') || name.includes('lease')) {
    return 'Rent & Leases';
  } else if (name.includes('insurance')) {
    return 'Insurance';
  } else if (name.includes('professional') || name.includes('legal')) {
    return 'Professional Services';
  } else if (name.includes('software') || name.includes('subscriptions')) {
    return 'Software & Subscriptions';
  } else if (name.includes('vehicle') || name.includes('auto') || name.includes('gas')) {
    return 'Vehicle Expenses';
  } else {
    return 'Business Expenses';
  }
}

async function updateBudgetCategory(userId: string, categoryName: string, amount: number, month: string) {
  try {
    // Get existing budget category
    const { data: existing } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', userId)
      .eq('name', categoryName)
      .eq('month', month)
      .single();

    const currentSpent = existing?.spent_amount || 0;
    const targetAmount = existing?.target_amount || 0;

    // Upsert budget category with updated spent amount
    await supabase
      .from('budget_categories')
      .upsert({
        user_id: userId,
        name: categoryName,
        month: month,
        target_amount: targetAmount,
        spent_amount: currentSpent + amount,
      }, {
        onConflict: 'user_id,name,month'
      });
  } catch (error) {
    console.error('Budget category update error:', error);
  }
}
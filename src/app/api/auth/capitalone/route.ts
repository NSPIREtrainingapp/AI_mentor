import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Capital One OAuth callback handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/dashboard?error=capitalone_auth_failed');
  }

  if (!code) {
    return NextResponse.redirect('/dashboard?error=no_auth_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.capitalone.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.CAPITAL_ONE_CLIENT_ID}:${process.env.CAPITAL_ONE_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.CAPITAL_ONE_REDIRECT_URI!,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received from Capital One');
    }

    // Store tokens securely
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.auth.updateUser({
        data: {
          capital_one_access_token: tokens.access_token,
          capital_one_refresh_token: tokens.refresh_token,
          capital_one_connected: true,
          capital_one_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        }
      });

      // Immediately sync account and transaction data
      await syncCapitalOneData(user.id, tokens.access_token);
    }

    return NextResponse.redirect('/dashboard?success=capitalone_connected');
  } catch (error) {
    console.error('Capital One auth error:', error);
    return NextResponse.redirect('/dashboard?error=capitalone_connection_failed');
  }
}

// Initiate Capital One OAuth flow
export async function POST() {
  const capitalOneAuthUrl = new URL('https://api.capitalone.com/oauth2/authorize');
  
  capitalOneAuthUrl.searchParams.set('client_id', process.env.CAPITAL_ONE_CLIENT_ID!);
  capitalOneAuthUrl.searchParams.set('redirect_uri', process.env.CAPITAL_ONE_REDIRECT_URI!);
  capitalOneAuthUrl.searchParams.set('response_type', 'code');
  capitalOneAuthUrl.searchParams.set('scope', 'read_accounts read_transactions');

  return NextResponse.json({ authUrl: capitalOneAuthUrl.toString() });
}

async function syncCapitalOneData(userId: string, accessToken: string) {
  try {
    // Fetch accounts
    const accountsResponse = await fetch('https://api.capitalone.com/accounts', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    const accountsData = await accountsResponse.json();

    if (accountsData.accounts) {
      for (const account of accountsData.accounts) {
        // Fetch transactions for each account
        const transactionsResponse = await fetch(
          `https://api.capitalone.com/accounts/${account.accountId}/transactions?limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        );

        const transactionsData = await transactionsResponse.json();

        if (transactionsData.transactions) {
          // Process and store transactions
          for (const transaction of transactionsData.transactions) {
            const amount = Math.abs(parseFloat(transaction.amount));
            const isDebit = transaction.amount < 0;

            if (isDebit) { // Only process expenses, not credits/deposits
              await supabase
                .from('transactions')
                .upsert({
                  user_id: userId,
                  account_id: account.accountId,
                  transaction_id: transaction.transactionId,
                  amount: amount,
                  description: transaction.description,
                  category: categorizeTransaction(transaction.description),
                  date: transaction.transactionDate,
                  account_name: account.nickname || account.productName,
                  merchant: transaction.merchantName,
                }, {
                  onConflict: 'transaction_id'
                });

              // Update budget categories
              const category = categorizeTransaction(transaction.description);
              const month = transaction.transactionDate.substring(0, 7); // YYYY-MM

              await updateBudgetCategory(userId, category, amount, month);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Capital One data sync error:', error);
  }
}

function categorizeTransaction(description: string): string {
  const desc = description.toLowerCase();
  
  // Simple categorization logic - you can enhance this
  if (desc.includes('grocery') || desc.includes('food') || desc.includes('restaurant')) {
    return 'Food & Groceries';
  } else if (desc.includes('gas') || desc.includes('fuel') || desc.includes('exxon') || desc.includes('shell')) {
    return 'Transportation';
  } else if (desc.includes('amazon') || desc.includes('target') || desc.includes('walmart')) {
    return 'Shopping';
  } else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription')) {
    return 'Entertainment';
  } else if (desc.includes('electric') || desc.includes('water') || desc.includes('internet') || desc.includes('phone')) {
    return 'Utilities';
  } else if (desc.includes('rent') || desc.includes('mortgage')) {
    return 'Housing';
  } else {
    return 'Other';
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
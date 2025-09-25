import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { IngestData } from '@/types';

// Verify API key for security
function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.API_SECRET_KEY;
  
  if (!expectedKey) {
    console.error('API_SECRET_KEY not configured');
    return false;
  }
  
  return apiKey === expectedKey;
}

export async function POST(request: NextRequest) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: IngestData = await request.json();
    
    // Validate request body
    if (!body.type || !body.data) {
      return NextResponse.json(
        { error: 'Invalid request body. Required: type, data' },
        { status: 400 }
      );
    }

    // Get user from authorization (you may want to pass user_id in the request)
    // For now, assuming a system user or passed in the request
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required in x-user-id header' },
        { status: 400 }
      );
    }

    if (body.type === 'health') {
      // Upsert health data for today
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('health_data')
        .upsert({
          user_id: userId,
          date: today,
          sleep_hours: body.data.sleep_hours,
          steps: body.data.steps,
          glucose: body.data.glucose,
          calories: body.data.calories,
          protein: body.data.protein,
        }, {
          onConflict: 'user_id,date'
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json(
          { error: 'Database error' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, data });

    } else if (body.type === 'budget') {
      // Handle budget data
      const { category, amount, month, action } = body.data;
      
      if (!category || amount === undefined || !month) {
        return NextResponse.json(
          { error: 'Budget data requires: category, amount, month' },
          { status: 400 }
        );
      }

      const currentMonth = month || new Date().toISOString().substring(0, 7);
      
      if (action === 'set') {
        // Set target amount
        const { data, error } = await supabase
          .from('budget_categories')
          .upsert({
            user_id: userId,
            name: category,
            month: currentMonth,
            target_amount: amount,
          }, {
            onConflict: 'user_id,name,month'
          })
          .select();

        if (error) {
          console.error('Supabase error:', error);
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });

      } else {
        // Add to spent amount (default action)
        const { data: existing } = await supabase
          .from('budget_categories')
          .select('*')
          .eq('user_id', userId)
          .eq('name', category)
          .eq('month', currentMonth)
          .single();

        const currentSpent = existing?.spent_amount || 0;
        
        const { data, error } = await supabase
          .from('budget_categories')
          .upsert({
            user_id: userId,
            name: category,
            month: currentMonth,
            target_amount: existing?.target_amount || 0,
            spent_amount: currentSpent + amount,
          }, {
            onConflict: 'user_id,name,month'
          })
          .select();

        if (error) {
          console.error('Supabase error:', error);
          return NextResponse.json(
            { error: 'Database error' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, data });
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "health" or "budget"' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: 'Ingest health or budget data'
    }
  });
}
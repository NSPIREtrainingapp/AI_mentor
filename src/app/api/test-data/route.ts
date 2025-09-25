import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Test endpoint to add sample health data
export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('health_data')
      .upsert({
        user_id: user.id,
        date: today,
        sleep_hours: 7.5,
        steps: 8500,
        glucose: 95,
        calories: 2100,
        protein: 150
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Test data error:', error);
    return NextResponse.json({ error: 'Failed to add test data' }, { status: 500 });
  }
}

// GET handler for easy testing
export async function GET() {
  try {
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('health_data')
      .upsert({
        user_id: user.id,
        date: today,
        sleep_hours: 7.5,
        steps: 8500,
        glucose: 95,
        calories: 2100,
        protein: 150
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data, message: 'Test data added successfully!' });
  } catch (error) {
    console.error('Test data error:', error);
    return NextResponse.json({ error: 'Failed to add test data' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        error: 'Not authenticated',
        details: userError?.message
      }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Try to insert test health data
    const testHealthData = {
      user_id: user.id,
      date: today,
      sleep_hours: 7.5,
      steps: 8500,
      glucose: 95,
      calories: 2100,
      protein: 120
    };

    const { data, error } = await supabase
      .from('health_data')
      .upsert(testHealthData, {
        onConflict: 'user_id,date'
      })
      .select();

    if (error) {
      return NextResponse.json({
        error: 'Database operation failed',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test data inserted successfully',
      data: data,
      user_id: user.id,
      date: today
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
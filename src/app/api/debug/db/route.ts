import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test database connection
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
    
    // Check if health_data table exists
    const { data: healthCheck, error: healthError } = await supabase
      .from('health_data')
      .select('count')
      .limit(1);

    // Check if we can query without auth
    const { data: publicCheck, error: publicError } = await supabase
      .from('health_data')
      .select('*')
      .limit(1);

    return NextResponse.json({
      tablesQuery: { data: tables, error: tablesError?.message },
      healthTableCheck: { data: healthCheck, error: healthError?.message },
      publicQuery: { data: publicCheck, error: publicError?.message },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Database setup SQL
    const setupQueries = [
      // Enable RLS
      'ALTER TABLE IF EXISTS health_data ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE IF EXISTS budget_categories ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;',
      
      // Create tables
      `CREATE TABLE IF NOT EXISTS health_data (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        sleep_hours DECIMAL(4,2),
        steps INTEGER,
        glucose DECIMAL(5,2),
        calories INTEGER,
        protein DECIMAL(6,2),
        heart_rate INTEGER,
        weight DECIMAL(5,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, date)
      );`,
      
      `CREATE TABLE IF NOT EXISTS budget_categories (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users NOT NULL,
        name VARCHAR(255) NOT NULL,
        target_amount DECIMAL(10,2) DEFAULT 0,
        spent_amount DECIMAL(10,2) DEFAULT 0,
        month VARCHAR(7) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, name, month)
      );`,
      
      `CREATE TABLE IF NOT EXISTS transactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users NOT NULL,
        account_id VARCHAR(255),
        transaction_id VARCHAR(255) UNIQUE,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT,
        category VARCHAR(255),
        date DATE NOT NULL,
        account_name VARCHAR(255),
        merchant VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ];

    // Execute setup queries
    for (const query of setupQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error('SQL Error:', error);
      }
    }

    // Drop existing policies to recreate them
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view their own health data" ON health_data;',
      'DROP POLICY IF EXISTS "Users can view their own budget data" ON budget_categories;',
      'DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;'
    ];

    for (const query of dropPolicies) {
      await supabase.rpc('exec_sql', { sql: query });
    }

    // Create RLS policies
    const policyQueries = [
      `CREATE POLICY "Users can view their own health data" ON health_data
        FOR ALL USING (auth.uid() = user_id);`,
      
      `CREATE POLICY "Users can view their own budget data" ON budget_categories
        FOR ALL USING (auth.uid() = user_id);`,
      
      `CREATE POLICY "Users can view their own transactions" ON transactions
        FOR ALL USING (auth.uid() = user_id);`
    ];

    for (const query of policyQueries) {
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error('Policy Error:', error);
      }
    }

    // Test the setup
    const { data: testData, error: testError } = await supabase
      .from('health_data')
      .select('count')
      .limit(1);

    return NextResponse.json({
      success: true,
      message: 'Database setup completed',
      testResult: { data: testData, error: testError?.message },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
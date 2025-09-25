import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (typeof window !== 'undefined') {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key exists:', !!supabaseAnonKey);
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not configured!');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured!');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database schema setup SQL (for reference)
export const DATABASE_SCHEMA = `
-- Enable RLS
ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

-- Health data table
CREATE TABLE IF NOT EXISTS health_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sleep_hours DECIMAL(4,2),
  steps INTEGER,
  glucose DECIMAL(5,2),
  calories INTEGER,
  protein DECIMAL(6,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Budget categories table
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(10,2) DEFAULT 0,
  spent_amount DECIMAL(10,2) DEFAULT 0,
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name, month)
);

-- RLS Policies
CREATE POLICY "Users can view their own health data" ON health_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget data" ON budget_categories
  FOR ALL USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_health_data_updated_at BEFORE UPDATE
  ON health_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_categories_updated_at BEFORE UPDATE
  ON budget_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;

// Helper functions
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const signInWithEmail = async (email: string) => {
  return await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};
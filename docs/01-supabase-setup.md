# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: "AI Mentor Hub"
   - Database Password: (generate a strong password)
   - Region: Choose closest to you
5. Click "Create new project"

## Step 2: Get Your Keys

After project creation:
1. Go to Settings → API
2. Copy these values:
   - Project URL
   - Project API keys → anon public key

## Step 3: Update Environment Variables

Replace the placeholder values in your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
API_SECRET_KEY=generate-a-secure-random-string-32-chars-min
```

## Step 4: Create Database Tables

1. Go to SQL Editor in Supabase dashboard
2. Run this SQL script:

```sql
-- Enable RLS
ALTER TABLE IF EXISTS health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budget_categories ENABLE ROW LEVEL SECURITY;

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
  heart_rate INTEGER,
  weight DECIMAL(5,2),
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

-- Transactions table for detailed financial tracking
CREATE TABLE IF NOT EXISTS transactions (
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
);

-- RLS Policies
CREATE POLICY "Users can view their own health data" ON health_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget data" ON budget_categories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" ON transactions
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_data_user_date ON health_data(user_id, date);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_month ON budget_categories(user_id, month);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
```

## Step 5: Configure Authentication

1. Go to Authentication → Settings
2. Enable Email authentication
3. Disable "Confirm email" if you want instant access (or keep enabled for security)
4. Configure email templates if desired

## Step 6: Test Connection

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000
3. Try signing up with your email
4. Check if you receive the magic link email

Your Supabase backend is now ready! ✅
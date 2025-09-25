# AI Mentor Hub

A production-ready Next.js 14 PWA for personal health and budget tracking, designed for Samsung S24 and mobile devices.

## 🚀 Features

- **PWA Support**: Install on your Samsung S24 using Chrome's "Add to Home Screen"
- **Supabase Authentication**: Magic link email authentication (no passwords)
- **Health Dashboard**: Track sleep, steps, glucose, calories, and protein
- **Budget Dashboard**: Zero-based budgeting with category targets vs spent
- **Secure Ingest API**: Accept data from automations and external tools
- **Mobile-First Design**: Optimized for mobile devices with responsive layout
- **TypeScript**: Full type safety and better developer experience
- **Tailwind CSS**: Clean, modern UI styling

## 📱 Installation on Samsung S24

1. Open Chrome on your Samsung S24
2. Navigate to your deployed app URL
3. Tap the three-dot menu → "Add to Home screen"
4. Confirm installation
5. The app will appear on your home screen like a native app

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (Magic Links)
- **Database**: Supabase PostgreSQL
- **PWA**: next-pwa with Workbox
- **Deployment**: Ready for Vercel

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/ingest/        # Secure data ingestion endpoint
│   ├── layout.tsx         # PWA meta tags and global layout
│   └── page.tsx           # Main dashboard page
├── components/            # React components
│   ├── AuthGuard.tsx      # Authentication wrapper
│   ├── Dashboard.tsx      # Main dashboard with tabs
│   ├── HealthDashboard.tsx # Health metrics display
│   └── BudgetDashboard.tsx # Budget tracking display
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication state management
├── lib/                   # Utilities and configurations
│   └── supabase.ts       # Supabase client and helpers
└── types/                 # TypeScript type definitions
    └── index.ts          # Shared type definitions
```

## 🔧 Setup Instructions

### 1. Environment Configuration

Copy `.env.local.example` to `.env.local` and configure:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Security
API_SECRET_KEY=your_secure_random_string_for_api_authentication
```

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 2. Supabase Database Setup

Run this SQL in your Supabase SQL editor:

```sql
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

-- Enable RLS and create policies
ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health data" ON health_data
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budget data" ON budget_categories
  FOR ALL USING (auth.uid() = user_id);
```

## 📊 API Usage

### Secure Ingest Endpoint

Send data to `/api/ingest` with headers:
- `x-api-key`: Your API secret key
- `x-user-id`: User's UUID from Supabase Auth

#### Health Data Example
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -H "x-user-id: user_uuid" \
  -d '{"type": "health", "data": {"sleep_hours": 8.5, "steps": 12000}}'
```

#### Budget Data Example
```bash
# Set category target
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -H "x-user-id: user_uuid" \
  -d '{"type": "budget", "data": {"category": "Groceries", "amount": 500, "action": "set"}}'

# Add expense
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -H "x-user-id: user_uuid" \
  -d '{"type": "budget", "data": {"category": "Groceries", "amount": 45.50}}'
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 🔮 Future Enhancements (TODOs)

- **Firebase Cloud Messaging**: Push notifications for health reminders and budget alerts
- **Make.com Integration**: Webhook endpoints for workflow automation
- **Data Visualization**: Charts and trends for health and budget data
- **Export Functionality**: PDF reports and data export

## 🛡️ Security & PWA Features

- Row Level Security (RLS) in Supabase
- API key authentication for ingest endpoint
- Magic link authentication (no passwords)
- Installable PWA optimized for Samsung S24
- Offline capability and native app-like experience

---

**AI Mentor Hub** - Your personal health and budget tracking companion 📱💪💰

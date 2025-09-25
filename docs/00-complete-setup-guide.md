# Complete Integration Setup Guide

This guide will walk you through connecting all your health and financial data sources to AI Mentor Hub.

## 🎯 Overview

Your AI Mentor Hub can integrate with:
- **Samsung Health** (via Google Fit) → Steps, sleep, heart rate, weight
- **Dexcom CGM** → Real-time glucose monitoring
- **Capital One** → Banking and credit card transactions
- **QuickBooks Online** → Business financial data

## 📋 Prerequisites Checklist

- [ ] Supabase project configured
- [ ] AI Mentor Hub deployed and running
- [ ] Email address for authentication
- [ ] Active accounts with services you want to connect

## 🔧 Step-by-Step Setup

### 1. Complete Supabase Setup (Required First)

1. **Create Supabase Project**: Follow `docs/01-supabase-setup.md`
2. **Update Environment Variables**: Add your Supabase URL and keys to `.env.local`
3. **Run Database Setup**: Execute the SQL schema in Supabase SQL Editor
4. **Test Authentication**: Sign up/login to your app with email

### 2. Samsung Health Integration

**Option A: Google Fit Sync (Recommended)**
1. **Enable Samsung Health → Google Fit**:
   - Open Samsung Health on your S24
   - Settings → Connected services → Google Fit
   - Enable data sharing for all health metrics

2. **Set up Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create project: "AI Mentor Hub Health"
   - Enable Google Fit API
   - Create OAuth 2.0 credentials

3. **Add to Environment Variables**:
   ```bash
   GOOGLE_FIT_CLIENT_ID=your_google_client_id
   GOOGLE_FIT_CLIENT_SECRET=your_google_client_secret
   NEXT_PUBLIC_SITE_URL=http://localhost:3000  # or your deployed URL
   ```

4. **Connect in App**:
   - Go to Data Connections tab
   - Click "Connect" for Google Fit
   - Authorize access to fitness data

### 3. Dexcom Integration (If You Have CGM)

1. **Apply for Dexcom Developer Access**:
   - Visit [developer.dexcom.com](https://developer.dexcom.com)
   - Create account and apply for API access
   - Wait for approval (1-2 business days)

2. **Create Dexcom App**:
   - Create app in developer portal
   - Set redirect URI: `your-app-url/api/auth/dexcom`
   - Get Client ID and Secret

3. **Add Environment Variables**:
   ```bash
   DEXCOM_CLIENT_ID=your_dexcom_client_id
   DEXCOM_CLIENT_SECRET=your_dexcom_client_secret
   DEXCOM_REDIRECT_URI=your-app-url/api/auth/dexcom
   ```

4. **Connect in App**:
   - Go to Data Connections tab
   - Click "Connect" for Dexcom
   - Login with your Dexcom account

### 4. Capital One Integration

1. **Register with Capital One DevExchange**:
   - Go to [developer.capitalone.com](https://developer.capitalone.com)
   - Create developer account
   - Create new application

2. **Configure App**:
   - App name: "AI Mentor Hub"
   - Redirect URI: `your-app-url/api/auth/capitalone`
   - Select APIs: Account Information, Transaction History

3. **Add Environment Variables**:
   ```bash
   CAPITAL_ONE_CLIENT_ID=your_capital_one_client_id
   CAPITAL_ONE_CLIENT_SECRET=your_capital_one_client_secret
   CAPITAL_ONE_REDIRECT_URI=your-app-url/api/auth/capitalone
   ```

4. **Connect in App**:
   - Go to Data Connections tab
   - Click "Connect" for Capital One
   - Login with Capital One credentials

### 5. QuickBooks Online Integration

1. **Create Intuit Developer Account**:
   - Go to [developer.intuit.com](https://developer.intuit.com)
   - Sign up and create developer profile
   - Create new app for QuickBooks Online

2. **Configure App**:
   - App name: "AI Mentor Hub"
   - Redirect URI: `your-app-url/api/auth/quickbooks`
   - Select QuickBooks Online API access

3. **Add Environment Variables**:
   ```bash
   QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
   QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
   QUICKBOOKS_REDIRECT_URI=your-app-url/api/auth/quickbooks
   QUICKBOOKS_SCOPE=com.intuit.quickbooks.accounting
   ```

4. **Connect in App**:
   - Go to Data Connections tab
   - Click "Connect" for QuickBooks
   - Select your company and authorize

## 🔄 Data Synchronization

### Automatic Sync Schedule
- **Samsung Health**: Manual sync (click "Sync All")
- **Dexcom**: Real-time (every 5 minutes)
- **Capital One**: Daily automatic sync
- **QuickBooks**: Real-time transaction updates

### Manual Sync
- Go to Data Connections tab
- Click "Sync All" to refresh all connected services
- Individual service sync available via API

## 📱 Mobile Usage on Samsung S24

### Install as PWA
1. Open Chrome on your S24
2. Navigate to your deployed app
3. Menu → "Add to Home screen"
4. App installs like native app

### Daily Workflow
1. **Morning**: Check health dashboard for sleep/glucose
2. **Throughout Day**: Automatic data collection
3. **Evening**: Review budget spending for the day
4. **Weekly**: Sync all data and review trends

## 🔐 Security & Privacy

### Data Protection
- All API keys stored as environment variables
- Row Level Security (RLS) in Supabase
- OAuth 2.0 for all service connections
- No passwords stored (magic link auth)

### What Data is Stored
- **Health**: Sleep, steps, glucose, calories, protein
- **Financial**: Transactions, budget categories, spending
- **Personal**: Email address only (no other personal data)

## 🛠️ Troubleshooting

### Connection Issues
- Check environment variables are set correctly
- Verify redirect URIs match exactly
- Ensure services are active (subscriptions current)
- Check API rate limits

### Data Sync Problems
- Try manual sync first
- Check service status pages
- Verify account permissions
- Review connection status in app

### Common Errors
- `Unauthorized`: Check API credentials
- `Rate Limited`: Wait and try again
- `Token Expired`: Disconnect and reconnect service
- `No Data`: Verify data exists in source system

## 📞 Support

### Service-Specific Support
- **Supabase**: [supabase.com/support](https://supabase.com/support)
- **Google Fit**: [developers.google.com/fit/support](https://developers.google.com/fit/support)
- **Dexcom**: [developer.dexcom.com/support](https://developer.dexcom.com/support)
- **Capital One**: [developer.capitalone.com/support](https://developer.capitalone.com/support)
- **QuickBooks**: [developer.intuit.com/support](https://developer.intuit.com/support)

## 🎉 You're All Set!

Once connected, your AI Mentor Hub will:
- ✅ Track your health metrics automatically
- ✅ Monitor your spending and budget
- ✅ Provide insights on your Samsung S24
- ✅ Sync data across all your devices
- ✅ Keep everything secure and private

Start with Supabase setup, then add integrations one at a time. Each integration adds more value to your personal AI mentor!
# Capital One Integration Guide

Capital One provides banking data through their DevExchange API platform.

## Step 1: Capital One Developer Account

1. **Register for Capital One DevExchange**:
   - Go to [developer.capitalone.com](https://developer.capitalone.com)
   - Create developer account
   - Complete verification process

2. **Create Application**:
   - Login to DevExchange portal
   - Create new application: "AI Mentor Hub"
   - Select APIs: "Account Information" and "Transaction History"
   - Set redirect URI: `http://localhost:3000/api/auth/capitalone`

## Step 2: Environment Variables

Add to your `.env.local`:

```bash
CAPITAL_ONE_CLIENT_ID=your_capital_one_client_id
CAPITAL_ONE_CLIENT_SECRET=your_capital_one_client_secret
CAPITAL_ONE_REDIRECT_URI=http://localhost:3000/api/auth/capitalone
```

## Step 3: Available Data

- **Account Information**: Balance, account type, account name
- **Transaction History**: Amount, description, date, merchant
- **Categories**: Auto-categorized spending
- **Real-time Updates**: New transactions as they post

## Step 4: User Connection Process

1. **OAuth Authorization**:
   - User clicks "Connect Capital One"
   - Redirected to Capital One login
   - User enters Capital One credentials
   - Grants permission for account access

2. **Automatic Sync**:
   - Transactions sync daily
   - Categories automatically mapped to budget
   - Spending tracked against budget targets

## Step 5: Budget Integration

- **Auto-categorization**: Transactions mapped to budget categories
- **Spending alerts**: When approaching budget limits
- **Monthly summaries**: Spending vs budget analysis
- **Trend tracking**: Month-over-month comparisons

## Important Notes

- Capital One API is available for Capital One customers only
- Requires active Capital One bank account
- Data refreshes once per day (not real-time)
- Rate limits: 100 requests per minute
- Sandbox environment available for testing
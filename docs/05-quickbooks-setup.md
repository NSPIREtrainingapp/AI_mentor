# QuickBooks Online Integration Guide

QuickBooks Online provides comprehensive financial data through Intuit's Developer Platform.

## Step 1: Intuit Developer Account

1. **Create Intuit Developer Account**:
   - Go to [developer.intuit.com](https://developer.intuit.com)
   - Sign up with Intuit ID
   - Complete developer profile

2. **Create App**:
   - Go to "My Apps" → "Create an app"
   - Select "QuickBooks Online and Payments"
   - App name: "AI Mentor Hub"
   - Set redirect URI: `http://localhost:3000/api/auth/quickbooks`

## Step 2: Environment Variables

Add to your `.env.local`:

```bash
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/auth/quickbooks
QUICKBOOKS_SCOPE=com.intuit.quickbooks.accounting
```

## Step 3: Available Data

- **Income & Expenses**: Revenue, costs, profit/loss
- **Categories**: Detailed expense categorization
- **Vendors**: Supplier and vendor information
- **Customers**: Customer and invoice data
- **Tax Information**: Tax categories and calculations
- **Reports**: P&L, Balance Sheet, Cash Flow

## Step 4: Integration Benefits

- **Business Budget Tracking**: Professional expense management
- **Tax Preparation**: Automated categorization for taxes
- **Cash Flow Analysis**: Income vs expenses trends
- **Vendor Management**: Track spending by supplier
- **Profitability**: Revenue and margin analysis

## Step 5: Connection Process

1. **OAuth Authorization**:
   - User clicks "Connect QuickBooks"
   - Redirected to Intuit login
   - User selects QuickBooks company
   - Grants permission for data access

2. **Data Synchronization**:
   - Expenses sync to budget categories
   - Income tracked for cash flow
   - Reports generated automatically
   - Monthly financial summaries

## Important Notes

- Requires active QuickBooks Online subscription
- Data refreshes in real-time
- Rate limits: 500 requests per minute
- Sandbox environment available
- Supports multiple QuickBooks companies
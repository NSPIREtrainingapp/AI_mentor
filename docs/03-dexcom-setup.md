# Dexcom Integration Guide

Dexcom provides glucose monitoring data through their official API.

## Step 1: Dexcom Developer Account Setup

1. **Register for Dexcom Developer Program**:
   - Go to [developer.dexcom.com](https://developer.dexcom.com)
   - Create account and apply for API access
   - Wait for approval (usually 1-2 business days)

2. **Create Application**:
   - Login to Dexcom Developer Portal
   - Create new application: "AI Mentor Hub"
   - Set redirect URI: `http://localhost:3000/api/auth/dexcom`
   - Note down: Client ID, Client Secret

## Step 2: Environment Variables

Add to your `.env.local`:

```bash
DEXCOM_CLIENT_ID=your_dexcom_client_id
DEXCOM_CLIENT_SECRET=your_dexcom_client_secret
DEXCOM_REDIRECT_URI=http://localhost:3000/api/auth/dexcom
```

## Step 3: Implementation

The integration includes:
- OAuth authentication with Dexcom
- Automatic glucose data syncing
- Real-time glucose monitoring
- Historical data import

## Step 4: User Authorization

1. **Connect Dexcom Account**:
   - User clicks "Connect Dexcom" in your app
   - Redirected to Dexcom authorization
   - User logs in with Dexcom credentials
   - Grants permission to access glucose data

2. **Automatic Data Sync**:
   - Your app receives glucose readings every 5 minutes
   - Data is automatically stored in Supabase
   - Latest reading appears on health dashboard

## Step 5: Data Types Available

- **Real-time glucose values** (every 5 minutes)
- **Glucose trends** (rising, falling, stable)
- **Historical data** (up to 90 days)
- **Calibration events**
- **Device status** (sensor session info)

## Important Notes

- Dexcom API has rate limits (200 requests per hour)
- Data is delayed by ~3 minutes for safety
- Requires active Dexcom CGM subscription
- Users must have Dexcom G6 or G7 system
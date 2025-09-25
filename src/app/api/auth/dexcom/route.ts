import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Dexcom OAuth callback handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/dashboard?error=dexcom_auth_failed');
  }

  if (!code) {
    return NextResponse.redirect('/dashboard?error=no_auth_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://sandbox-api.dexcom.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.DEXCOM_CLIENT_ID}:${process.env.DEXCOM_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.DEXCOM_REDIRECT_URI!,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received from Dexcom');
    }

    // Store tokens securely
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.auth.updateUser({
        data: {
          dexcom_access_token: tokens.access_token,
          dexcom_refresh_token: tokens.refresh_token,
          dexcom_connected: true,
          dexcom_token_expires: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        }
      });

      // Immediately sync initial data
      await syncDexcomData(user.id, tokens.access_token);
    }

    return NextResponse.redirect('/dashboard?success=dexcom_connected');
  } catch (error) {
    console.error('Dexcom auth error:', error);
    return NextResponse.redirect('/dashboard?error=dexcom_connection_failed');
  }
}

// Initiate Dexcom OAuth flow
export async function POST() {
  const dexcomAuthUrl = new URL('https://sandbox-api.dexcom.com/v2/oauth2/login');
  
  dexcomAuthUrl.searchParams.set('client_id', process.env.DEXCOM_CLIENT_ID!);
  dexcomAuthUrl.searchParams.set('redirect_uri', process.env.DEXCOM_REDIRECT_URI!);
  dexcomAuthUrl.searchParams.set('response_type', 'code');
  dexcomAuthUrl.searchParams.set('scope', 'offline_access');

  return NextResponse.json({ authUrl: dexcomAuthUrl.toString() });
}

async function syncDexcomData(userId: string, accessToken: string) {
  try {
    // Get last 24 hours of glucose data
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();

    const response = await fetch(
      `https://sandbox-api.dexcom.com/v2/users/self/egvs?startDate=${startTime}&endDate=${endTime}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (data.egvs && data.egvs.length > 0) {
      // Get the most recent glucose reading
      const latestReading = data.egvs[data.egvs.length - 1];
      const glucoseValue = latestReading.value;
      const readingTime = new Date(latestReading.systemTime);
      const today = readingTime.toISOString().split('T')[0];

      // Update today's health data with latest glucose
      await supabase
        .from('health_data')
        .upsert({
          user_id: userId,
          date: today,
          glucose: glucoseValue,
        }, {
          onConflict: 'user_id,date'
        });
    }
  } catch (error) {
    console.error('Dexcom data sync error:', error);
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Google Fit OAuth callback handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect('/dashboard?error=google_fit_auth_failed');
  }

  if (!code) {
    return NextResponse.redirect('/dashboard?error=no_auth_code');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_FIT_CLIENT_ID!,
        client_secret: process.env.GOOGLE_FIT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Store tokens securely (in production, encrypt these)
    // For now, we'll store in Supabase user metadata
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.auth.updateUser({
        data: {
          google_fit_access_token: tokens.access_token,
          google_fit_refresh_token: tokens.refresh_token,
          google_fit_connected: true,
        }
      });
    }

    return NextResponse.redirect('/dashboard?success=google_fit_connected');
  } catch (error) {
    console.error('Google Fit auth error:', error);
    return NextResponse.redirect('/dashboard?error=google_fit_connection_failed');
  }
}

// Initiate Google Fit OAuth flow
export async function POST() {
  const googleFitAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  googleFitAuthUrl.searchParams.set('client_id', process.env.GOOGLE_FIT_CLIENT_ID!);
  googleFitAuthUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google`);
  googleFitAuthUrl.searchParams.set('scope', [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
  ].join(' '));
  googleFitAuthUrl.searchParams.set('response_type', 'code');
  googleFitAuthUrl.searchParams.set('access_type', 'offline');
  googleFitAuthUrl.searchParams.set('prompt', 'consent');

  return NextResponse.json({ authUrl: googleFitAuthUrl.toString() });
}
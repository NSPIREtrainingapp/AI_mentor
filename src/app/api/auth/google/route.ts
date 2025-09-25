import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Google Fit OAuth callback handler
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  // TEMPORARY: Use production redirect URI since localhost isn't added to Google Console yet
  const redirectUri = 'https://ai-mentor-three.vercel.app/api/auth/google';
  const baseUrl = 'https://ai-mentor-three.vercel.app';

  if (error) {
    return NextResponse.redirect(new URL('/?error=google_fit_auth_failed', baseUrl!));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_auth_code', baseUrl!));
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
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
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

    return NextResponse.redirect(new URL('/?success=google_fit_connected', baseUrl!));
  } catch (error) {
    console.error('Google Fit auth error:', error);
    return NextResponse.redirect(new URL('/?error=google_fit_connection_failed', baseUrl!));
  }
}

// Initiate Google Fit OAuth flow
export async function POST(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  
  // Determine the correct redirect URI based on environment
  const isDev = process.env.NODE_ENV === 'development';
  const host = request.headers.get('host') || 'localhost:3000';
  
  // For now, always use production URI since it's the only one registered
  const redirectUri = 'https://ai-mentor-three.vercel.app/api/auth/google';
  
  console.log('OAuth Debug:');
  console.log('Client ID:', clientId);
  console.log('Redirect URI:', redirectUri);
  console.log('Host:', host);
  console.log('Environment:', process.env.NODE_ENV);
  
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID is not set!');
    return NextResponse.json({ 
      error: 'OAuth not configured',
      debug: 'GOOGLE_CLIENT_ID environment variable is missing'
    }, { status: 500 });
  }
  
  // Validate the client ID format
  if (!clientId.includes('.apps.googleusercontent.com')) {
    console.error('Invalid GOOGLE_CLIENT_ID format:', clientId);
    return NextResponse.json({ 
      error: 'Invalid OAuth configuration',
      debug: 'GOOGLE_CLIENT_ID appears to be malformed'
    }, { status: 500 });
  }
  
  const googleFitAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  
  googleFitAuthUrl.searchParams.set('client_id', clientId);
  googleFitAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleFitAuthUrl.searchParams.set('scope', [
    'https://www.googleapis.com/auth/fitness.activity.read',
    'https://www.googleapis.com/auth/fitness.body.read',
    'https://www.googleapis.com/auth/fitness.heart_rate.read',
    'https://www.googleapis.com/auth/fitness.sleep.read',
  ].join(' '));
  googleFitAuthUrl.searchParams.set('response_type', 'code');
  googleFitAuthUrl.searchParams.set('access_type', 'offline');
  googleFitAuthUrl.searchParams.set('prompt', 'consent');

  const finalUrl = googleFitAuthUrl.toString();
  console.log('Final OAuth URL:', finalUrl);

  // Return both the URL and debug info
  return NextResponse.json({ 
    authUrl: finalUrl,
    debug: {
      clientId: clientId.substring(0, 20) + '...', // Hide full client ID
      redirectUri,
      environment: process.env.NODE_ENV
    }
  });
}
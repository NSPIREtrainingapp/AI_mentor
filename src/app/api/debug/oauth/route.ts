import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Google OAuth Test Endpoint',
    environment: process.env.NODE_ENV,
    clientId: process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing',
    clientIdFormat: process.env.GOOGLE_CLIENT_ID?.includes('.apps.googleusercontent.com') ? 'Valid' : 'Invalid',
    timestamp: new Date().toISOString()
  });
}

export async function POST() {
  try {
    console.log('=== Google OAuth Debug ===');
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('Client Secret present:', !!process.env.GOOGLE_CLIENT_SECRET);
    console.log('Node ENV:', process.env.NODE_ENV);
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/api/auth/google');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/fitness.activity.read');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    
    console.log('Generated URL:', authUrl.toString());
    
    return NextResponse.json({
      success: true,
      authUrl: authUrl.toString(),
      clientIdValid: process.env.GOOGLE_CLIENT_ID?.includes('.apps.googleusercontent.com'),
      redirectUri: 'http://localhost:3000/api/auth/google'
    });
  } catch (error) {
    console.error('OAuth test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
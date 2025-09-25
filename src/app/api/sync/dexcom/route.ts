import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Sync Dexcom CGM data
export async function POST(request: NextRequest) {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const accessToken = user.user_metadata?.dexcom_access_token;
    const tokenExpires = user.user_metadata?.dexcom_token_expires;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Dexcom not connected' }, { status: 400 });
    }

    // Check if token is expired and refresh if needed
    if (tokenExpires && new Date(tokenExpires) <= new Date()) {
      const refreshedTokens = await refreshDexcomToken(user.user_metadata?.dexcom_refresh_token);
      
      if (!refreshedTokens) {
        return NextResponse.json({ error: 'Failed to refresh Dexcom token' }, { status: 400 });
      }

      // Update user metadata with new tokens
      await supabase.auth.updateUser({
        data: {
          dexcom_access_token: refreshedTokens.access_token,
          dexcom_refresh_token: refreshedTokens.refresh_token,
          dexcom_token_expires: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
        }
      });
    }

    // Fetch recent glucose data (last 7 days)
    const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = new Date().toISOString();

    const response = await fetch(
      `https://sandbox-api.dexcom.com/v2/users/self/egvs?startDate=${startTime}&endDate=${endTime}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Dexcom API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.egvs || data.egvs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No glucose data available',
        readings_synced: 0 
      });
    }

    // Process and store glucose readings
    const processedDays = new Map();

    for (const reading of data.egvs) {
      const readingTime = new Date(reading.systemTime);
      const date = readingTime.toISOString().split('T')[0];
      const glucoseValue = reading.value;

      if (!processedDays.has(date) || readingTime > processedDays.get(date).time) {
        processedDays.set(date, {
          date,
          glucose: glucoseValue,
          time: readingTime,
        });
      }
    }

    // Update health_data table with latest glucose for each day
    const updates = [];
    for (const [date, dayData] of processedDays) {
      const { error } = await supabase
        .from('health_data')
        .upsert({
          user_id: user.id,
          date,
          glucose: dayData.glucose,
        }, {
          onConflict: 'user_id,date'
        });

      if (!error) {
        updates.push(date);
      }
    }

    // Also store detailed glucose readings for future trend analysis
    const detailedReadings = data.egvs.map((reading: any) => ({
      user_id: user.id,
      timestamp: reading.systemTime,
      glucose_value: reading.value,
      trend: reading.trend,
      trend_rate: reading.trendRate,
    }));

    // Create a glucose_readings table for detailed tracking
    await createGlucoseReadingsTable();
    
    // Insert detailed readings (this would require the glucose_readings table)
    // await supabase.from('glucose_readings').upsert(detailedReadings);

    return NextResponse.json({ 
      success: true, 
      days_updated: updates.length,
      total_readings: data.egvs.length,
      latest_glucose: data.egvs[data.egvs.length - 1]?.value,
      message: 'Dexcom glucose data synced successfully'
    });

  } catch (error) {
    console.error('Dexcom sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Dexcom data' },
      { status: 500 }
    );
  }
}

async function refreshDexcomToken(refreshToken: string) {
  try {
    const response = await fetch('https://sandbox-api.dexcom.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.DEXCOM_CLIENT_ID}:${process.env.DEXCOM_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return await response.json();
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

async function createGlucoseReadingsTable() {
  // This would create a detailed glucose readings table
  // You can run this SQL in Supabase:
  /*
  CREATE TABLE IF NOT EXISTS glucose_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    glucose_value INTEGER NOT NULL,
    trend VARCHAR(20),
    trend_rate DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, timestamp)
  );

  CREATE POLICY "Users can view their own glucose readings" ON glucose_readings
    FOR ALL USING (auth.uid() = user_id);

  CREATE INDEX idx_glucose_readings_user_timestamp ON glucose_readings(user_id, timestamp);
  */
}
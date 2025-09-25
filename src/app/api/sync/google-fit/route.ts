import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Sync Google Fit data to your app
export async function POST(request: NextRequest) {
  try {
    // Debug: Log the sync attempt
    console.log('Google Fit sync attempt started');
    
    // Get authorization header or cookie
    const authHeader = request.headers.get('authorization');
    const cookies = request.headers.get('cookie');
    
    console.log('Auth header:', !!authHeader);
    console.log('Cookies:', !!cookies);
    
    // Try to get user from session
    let user = null;
    let userError = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const result = await supabase.auth.getUser(token);
      user = result.data.user;
      userError = result.error;
    } else {
      // For now, we'll skip auth and use a mock approach
      console.log('No auth header, implementing fallback');
      return NextResponse.json({ 
        error: 'Authentication required', 
        message: 'Please implement proper session handling for API routes',
        suggestion: 'For now, we will implement a simpler approach'
      }, { status: 401 });
    }
    
    console.log('User auth result:', { user: !!user, error: userError });
    
    if (userError || !user) {
      console.log('Auth failed:', userError);
      return NextResponse.json({ error: 'User not authenticated', details: userError?.message }, { status: 401 });
    }

    const accessToken = user.user_metadata?.google_fit_access_token;
    console.log('Access token exists:', !!accessToken);
    
    if (!accessToken) {
      console.log('No Google Fit access token found');
      return NextResponse.json({ error: 'Google Fit not connected. Please connect your Google Fit account first.' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Fetch steps data from Google Fit API
      const stepsResponse = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataTypeName: 'com.google.step_count.delta',
            dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
          }],
          bucketByTime: { durationMillis: 86400000 }, // 1 day
          startTimeMillis: new Date(today).getTime(),
          endTimeMillis: new Date(today).getTime() + 86400000,
        })
      });

      if (!stepsResponse.ok) {
        throw new Error(`Google Fit API error: ${stepsResponse.status}`);
      }

      const stepsData = await stepsResponse.json();
      let steps = 0;
      
      if (stepsData.bucket && stepsData.bucket[0] && stepsData.bucket[0].dataset && stepsData.bucket[0].dataset[0]) {
        const points = stepsData.bucket[0].dataset[0].point;
        if (points && points.length > 0) {
          steps = points.reduce((total: number, point: any) => total + (point.value[0]?.intVal || 0), 0);
        }
      }

      // Store in Supabase
      const { data, error } = await supabase
        .from('health_data')
        .upsert({
          user_id: user.id,
          date: today,
          steps: steps,
          // We'll add other metrics later
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({ 
        success: true, 
        steps_synced: steps,
        data: data,
        message: `Google Fit data synced successfully! Steps: ${steps}`
      });

    } catch (apiError) {
      console.error('Google Fit API error:', apiError);
      return NextResponse.json(
        { error: 'Failed to fetch from Google Fit API', details: apiError instanceof Error ? apiError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Google Fit sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync Google Fit data' },
      { status: 500 }
    );
  }
}

async function fetchStepsData(accessToken: string, startTime: Date, endTime: Date) {
  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: 'com.google.step_count.delta',
        dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
      }],
      bucketByTime: { durationMillis: 86400000 }, // Daily buckets
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    }),
  });

  return await response.json();
}

async function fetchHeartRateData(accessToken: string, startTime: Date, endTime: Date) {
  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: 'com.google.heart_rate.bpm'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    }),
  });

  return await response.json();
}

async function fetchSleepData(accessToken: string, startTime: Date, endTime: Date) {
  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: 'com.google.sleep.segment'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    }),
  });

  return await response.json();
}

async function fetchWeightData(accessToken: string, startTime: Date, endTime: Date) {
  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: 'com.google.weight'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startTime.getTime(),
      endTimeMillis: endTime.getTime(),
    }),
  });

  return await response.json();
}

function processHealthData(steps: any, heartRate: any, sleep: any, weight: any) {
  const processedDays: any[] = [];
  
  // Process steps data
  if (steps.bucket) {
    for (const bucket of steps.bucket) {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const stepCount = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      
      let dayData = processedDays.find(d => d.date === date);
      if (!dayData) {
        dayData = { date, steps: stepCount };
        processedDays.push(dayData);
      } else {
        dayData.steps = stepCount;
      }
    }
  }

  // Process heart rate data
  if (heartRate.bucket) {
    for (const bucket of heartRate.bucket) {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const points = bucket.dataset?.[0]?.point || [];
      
      if (points.length > 0) {
        const avgHeartRate = points.reduce((sum: number, point: any) => 
          sum + (point.value?.[0]?.fpVal || 0), 0) / points.length;
        
        let dayData = processedDays.find(d => d.date === date);
        if (!dayData) {
          dayData = { date, heart_rate: Math.round(avgHeartRate) };
          processedDays.push(dayData);
        } else {
          dayData.heart_rate = Math.round(avgHeartRate);
        }
      }
    }
  }

  // Process sleep data
  if (sleep.bucket) {
    for (const bucket of sleep.bucket) {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const points = bucket.dataset?.[0]?.point || [];
      
      let totalSleepMillis = 0;
      for (const point of points) {
        const sleepType = point.value?.[0]?.intVal;
        if (sleepType === 1) { // Sleep state
          const startTime = parseInt(point.startTimeNanos) / 1000000;
          const endTime = parseInt(point.endTimeNanos) / 1000000;
          totalSleepMillis += endTime - startTime;
        }
      }
      
      if (totalSleepMillis > 0) {
        const sleepHours = totalSleepMillis / (1000 * 60 * 60);
        
        let dayData = processedDays.find(d => d.date === date);
        if (!dayData) {
          dayData = { date, sleep_hours: sleepHours };
          processedDays.push(dayData);
        } else {
          dayData.sleep_hours = sleepHours;
        }
      }
    }
  }

  // Process weight data
  if (weight.bucket) {
    for (const bucket of weight.bucket) {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0];
      const points = bucket.dataset?.[0]?.point || [];
      
      if (points.length > 0) {
        const latestWeight = points[points.length - 1].value?.[0]?.fpVal;
        
        let dayData = processedDays.find(d => d.date === date);
        if (!dayData) {
          dayData = { date, weight: latestWeight };
          processedDays.push(dayData);
        } else {
          dayData.weight = latestWeight;
        }
      }
    }
  }

  return processedDays;
}
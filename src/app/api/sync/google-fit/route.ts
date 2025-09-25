import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Sync Google Fit data to your app
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    // Get user's Google Fit tokens
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const accessToken = user.user_metadata?.google_fit_access_token;
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Google Fit not connected' }, { status: 400 });
    }

    const today = new Date();
    const startTime = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    // Fetch different types of fitness data
    const healthData = await Promise.all([
      fetchStepsData(accessToken, startTime, today),
      fetchHeartRateData(accessToken, startTime, today),
      fetchSleepData(accessToken, startTime, today),
      fetchWeightData(accessToken, startTime, today),
    ]);

    const [steps, heartRate, sleep, weight] = healthData;

    // Process and store data
    const processedData = processHealthData(steps, heartRate, sleep, weight);
    
    // Store in Supabase
    for (const dayData of processedData) {
      await supabase
        .from('health_data')
        .upsert({
          user_id: user.id,
          date: dayData.date,
          steps: dayData.steps,
          sleep_hours: dayData.sleep_hours,
          heart_rate: dayData.heart_rate,
          weight: dayData.weight,
        }, {
          onConflict: 'user_id,date'
        });
    }

    return NextResponse.json({ 
      success: true, 
      synced_days: processedData.length,
      message: 'Health data synced successfully'
    });

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
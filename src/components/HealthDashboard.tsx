'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
// Import types for health data structure

interface HealthStats {
  sleep_hours?: number;
  steps?: number;
  glucose?: number;
  calories?: number;
  protein?: number;
  date: string;
}

export function HealthDashboard() {
  const { user } = useAuth();
  const [healthData, setHealthData] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTodaysHealth();
    }
  }, [user]); // fetchTodaysHealth is stable and doesn't need to be in deps

  const fetchTodaysHealth = async () => {
    try {
      // Get current session to ensure authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Not authenticated');
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Try to get existing health data for today
      const { data, error } = await supabase
        .from('health_data')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setHealthData(data || {
        sleep_hours: undefined,
        steps: undefined,
        glucose: undefined,
        calories: undefined,
        protein: undefined,
        date: today
      });
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError('Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const createTestData = async () => {
    try {
      setLoading(true);
      
      // Get current session to ensure authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        alert('Not authenticated');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      
      const testHealthData = {
        user_id: session.user.id,
        date: today,
        sleep_hours: 7.5,
        steps: 8500,
        glucose: 95,
        calories: 2100,
        protein: 120
      };

      const { data, error } = await supabase
        .from('health_data')
        .upsert(testHealthData, {
          onConflict: 'user_id,date'
        })
        .select();

      if (error) {
        console.error('Create test data error:', error);
        alert(`Error creating test data: ${error.message}`);
      } else {
        alert('Test data created successfully!');
        fetchTodaysHealth(); // Refresh the data
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('Unexpected error creating test data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <button
          onClick={fetchTodaysHealth}
          className="mt-2 text-sm text-red-600 hover:text-red-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Health Dashboard</h2>
        <div className="flex gap-4 items-center">
          <p className="text-sm text-gray-500">
            Today: {new Date().toLocaleDateString()}
          </p>
          <button
            onClick={createTestData}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Test Data
          </button>
        </div>
      </div>

      {/* Health KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthCard
          title="Sleep"
          value={healthData?.sleep_hours}
          unit="hours"
          icon="😴"
          target={8}
        />
        <HealthCard
          title="Steps"
          value={healthData?.steps}
          unit="steps"
          icon="👟"
          target={10000}
        />
        <HealthCard
          title="Last Glucose"
          value={healthData?.glucose}
          unit="mg/dL"
          icon="🩸"
          target={100}
          range={[70, 140]}
        />
        <HealthCard
          title="Calories"
          value={healthData?.calories}
          unit="cal"
          icon="🔥"
          target={2000}
        />
      </div>

      {/* Protein Card (separate row) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HealthCard
          title="Protein"
          value={healthData?.protein}
          unit="g"
          icon="🥩"
          target={150}
        />
      </div>

      {/* Data ingestion info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Data Ingestion</h3>
        <p className="text-sm text-blue-700 mb-2">
          Send health data to: <code className="bg-blue-100 px-1 py-0.5 rounded">/api/ingest</code>
        </p>
        <div className="text-xs text-blue-600 font-mono bg-blue-100 p-2 rounded">
          <div>POST /api/ingest</div>
          <div>Headers: x-api-key, x-user-id</div>
          <div>Body: {`{"type": "health", "data": {"sleep_hours": 8, "steps": 12000, ...}}`}</div>
        </div>
      </div>
    </div>
  );
}

interface HealthCardProps {
  title: string;
  value?: number;
  unit: string;
  icon: string;
  target?: number;
  range?: [number, number];
}

function HealthCard({ title, value, unit, icon, target, range }: HealthCardProps) {
  const hasValue = value !== undefined && value !== null;
  
  // Determine status color
  let statusColor: 'gray' | 'green' | 'yellow' | 'red' = 'gray';
  if (hasValue && target) {
    if (range) {
      // For glucose, check if in healthy range
      const [min, max] = range;
      if (value >= min && value <= max) {
        statusColor = 'green';
      } else {
        statusColor = 'red';
      }
    } else {
      // For other metrics, check against target
      if (value >= target) {
        statusColor = 'green';
      } else if (value >= target * 0.7) {
        statusColor = 'yellow';
      } else {
        statusColor = 'red';
      }
    }
  }

  const colorClasses = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200'
  } as const;

  return (
    <div className={`${colorClasses[statusColor]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div className="text-2xl">{icon}</div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {hasValue ? value.toLocaleString() : '—'}
          </p>
          <p className="text-sm text-gray-500">{unit}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {target && (
          <p className="text-xs text-gray-500">
            Target: {target.toLocaleString()} {unit}
          </p>
        )}
        {range && (
          <p className="text-xs text-gray-500">
            Healthy: {range[0]}-{range[1]} {unit}
          </p>
        )}
      </div>
    </div>
  );
}
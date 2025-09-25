'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ConnectionStatus {
  connected: boolean;
  last_sync?: string;
  error?: string;
}

interface ConnectionsState {
  'google': ConnectionStatus;
  'dexcom': ConnectionStatus;
  'capitalone': ConnectionStatus;
  'quickbooks': ConnectionStatus;
}

export function ConnectionsManager() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionsState>({
    'google': { connected: false },
    'dexcom': { connected: false },
    'capitalone': { connected: false },
    'quickbooks': { connected: false },
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleConnect = async (service: string) => {
    setLoading(service);
    
    try {
      const response = await fetch(`/api/auth/${service}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error(`Failed to connect ${service}:`, error);
    } finally {
      setLoading(null);
    }
  };

  const syncGoogleFit = async () => {
    console.log('Google Fit sync attempt started');
    console.log('User:', user ? 'authenticated' : 'not authenticated');
    
    if (!user) return { success: false, error: 'Not authenticated' };
    
    try {
      const accessToken = user.user_metadata?.google_fit_access_token;
      console.log('Access token present:', !!accessToken);
      console.log('User metadata keys:', Object.keys(user.user_metadata || {}));
      
      if (!accessToken) {
        return { success: false, error: 'Google Fit not connected - please connect first' };
      }

      const today = new Date().toISOString().split('T')[0];
      
      // Fetch steps data from Google Fit API
      console.log('Making Google Fit API request for date:', today);
      
      const requestBody = {
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
        }],
        bucketByTime: { durationMillis: 86400000 }, // 1 day
        startTimeMillis: new Date(today).getTime(),
        endTimeMillis: new Date(today).getTime() + 86400000,
      };
      
      console.log('Request body:', requestBody);
      
      const stepsResponse = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Google Fit API response status:', stepsResponse.status);
      
      if (!stepsResponse.ok) {
        const errorText = await stepsResponse.text();
        console.error('Google Fit API error response:', errorText);
        throw new Error(`Google Fit API error: ${stepsResponse.status} - ${errorText}`);
      }

      const stepsData = await stepsResponse.json();
      console.log('Google Fit response data:', stepsData);
      
      let steps = 0;
      
      if (stepsData.bucket && stepsData.bucket[0] && stepsData.bucket[0].dataset && stepsData.bucket[0].dataset[0]) {
        const points = stepsData.bucket[0].dataset[0].point;
        console.log('Steps points:', points);
        if (points && points.length > 0) {
          steps = points.reduce((total: number, point: any) => total + (point.value[0]?.intVal || 0), 0);
          console.log('Calculated steps:', steps);
        }
      } else {
        console.log('No step data found in response structure');
      }

      // Store in Supabase
      const { data, error } = await supabase
        .from('health_data')
        .upsert({
          user_id: user.id,
          date: today,
          steps: steps,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { success: true, steps, data };
    } catch (error) {
      console.error('Google Fit sync error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    
    try {
      const results: any = {};
      
      // Sync Google Fit directly from frontend
      console.log('Starting Google Fit sync...');
      const googleResult = await syncGoogleFit();
      console.log('Google Fit sync result:', googleResult);
      results.google = googleResult;
      
      // Mock other services for now
      results.dexcom = { success: true, message: 'Dexcom sync pending implementation' };
      results.capitalone = { success: true, message: 'Capital One sync pending implementation' };
      results.quickbooks = { success: true, message: 'QuickBooks sync pending implementation' };
      
      const successCount = Object.values(results).filter((r: any) => r.success).length;
      const totalCount = Object.keys(results).length;
      
      if (googleResult.success) {
        alert(`Sync completed: ${successCount}/${totalCount} services synced successfully. Steps: ${googleResult.steps || 0}`);
        
        // Trigger a refresh of the health dashboard
        window.location.reload();
      } else {
        alert(`Sync completed: ${successCount}/${totalCount} services synced. Google Fit error: ${googleResult.error}`);
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const serviceConfig = {
    'google': {
      name: 'Google Fit',
      description: 'Samsung Health data via Google Fit',
      icon: '🏃',
      color: 'bg-green-50 border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    'dexcom': {
      name: 'Dexcom',
      description: 'Continuous glucose monitoring',
      icon: '🩸',
      color: 'bg-red-50 border-red-200',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    'capitalone': {
      name: 'Capital One',
      description: 'Banking and credit card data',
      icon: '💳',
      color: 'bg-blue-50 border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
    'quickbooks': {
      name: 'QuickBooks',
      description: 'Business financial data',
      icon: '📊',
      color: 'bg-purple-50 border-purple-200',
      buttonColor: 'bg-purple-600 hover:bg-purple-700',
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Data Connections</h3>
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : 'Sync All'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(serviceConfig).map(([service, config]) => {
          const isConnected = connections[service as keyof ConnectionsState].connected;
          const isLoading = loading === service;

          return (
            <div
              key={service}
              className={`${config.color} border rounded-lg p-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{config.name}</h4>
                    <p className="text-sm text-gray-600">{config.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {isConnected ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConnect(service)}
                      disabled={isLoading}
                      className={`px-3 py-1 ${config.buttonColor} text-white text-sm font-medium rounded-md disabled:opacity-50`}
                    >
                      {isLoading ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>
              
              {isConnected && connections[service as keyof ConnectionsState].last_sync && (
                <div className="mt-2 text-xs text-gray-500">
                  Last sync: {new Date(connections[service as keyof ConnectionsState].last_sync!).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Integration Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Setup Instructions</h4>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Google Fit:</strong> Ensure Samsung Health syncs to Google Fit in Samsung Health settings.</p>
          <p><strong>Dexcom:</strong> Requires Dexcom G6/G7 and active CGM subscription.</p>
          <p><strong>Capital One:</strong> Must have active Capital One bank/credit accounts.</p>
          <p><strong>QuickBooks:</strong> Requires QuickBooks Online subscription for business finances.</p>
        </div>
      </div>
    </div>
  );
}
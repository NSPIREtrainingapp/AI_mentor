'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ConnectionStatus {
  connected: boolean;
  last_sync?: string;
  error?: string;
}

interface ConnectionsState {
  'google-fit': ConnectionStatus;
  'dexcom': ConnectionStatus;
  'capitalone': ConnectionStatus;
  'quickbooks': ConnectionStatus;
}

export function ConnectionsManager() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionsState>({
    'google-fit': { connected: false },
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

  const handleSyncAll = async () => {
    setSyncing(true);
    
    try {
      const response = await fetch('/api/sync/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Update connection status based on sync results
        // This is a simplified update - in production you'd want more detailed status
        alert(`Sync completed: ${data.summary}`);
      } else {
        alert('Sync failed. Please check your connections.');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const serviceConfig = {
    'google-fit': {
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
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HealthDashboard } from './HealthDashboard';
import { BudgetDashboard } from './BudgetDashboard';
import { ConnectionsManager } from './ConnectionsManager';

type TabType = 'health' | 'budget' | 'connections';

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('health');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">AI Mentor Hub</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('health')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'health'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Health Dashboard
            </button>
            <button
              onClick={() => setActiveTab('budget')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'budget'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Budget Dashboard
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'connections'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Data Connections
            </button>
          </nav>
        </div>
      </div>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'health' && <HealthDashboard />}
        {activeTab === 'budget' && <BudgetDashboard />}
        {activeTab === 'connections' && <ConnectionsManager />}
      </main>

      {/* TODO: Add Firebase Cloud Messaging (FCM) setup */}
      {/* Future: Push notification registration and handling */}
    </div>
  );
}
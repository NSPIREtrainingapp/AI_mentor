'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BudgetCategory } from '@/types';

export function BudgetDashboard() {
  const { user } = useAuth();
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth] = useState(() => {
    return new Date().toISOString().substring(0, 7); // YYYY-MM format
  });

  useEffect(() => {
    if (user) {
      fetchBudgetData();
    }
  }, [user, currentMonth]); // fetchBudgetData is stable and doesn't need to be in deps

  const fetchBudgetData = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user?.id)
        .eq('month', currentMonth)
        .order('name');

      if (error) throw error;

      setBudgetData(data || []);
    } catch (err) {
      console.error('Error fetching budget data:', err);
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const totalTarget = budgetData.reduce((sum, category) => sum + category.target_amount, 0);
  const totalSpent = budgetData.reduce((sum, category) => sum + category.spent_amount, 0);
  const totalRemaining = totalTarget - totalSpent;

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
          onClick={fetchBudgetData}
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
        <h2 className="text-2xl font-bold text-gray-900">Budget Dashboard</h2>
        <p className="text-sm text-gray-500">
          {new Date(currentMonth + '-01').toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
          })}
        </p>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BudgetOverviewCard
          title="Total Budget"
          amount={totalTarget}
          icon="💰"
          color="blue"
        />
        <BudgetOverviewCard
          title="Total Spent"
          amount={totalSpent}
          icon="💸"
          color={totalSpent > totalTarget ? "red" : "green"}
        />
        <BudgetOverviewCard
          title="Remaining"
          amount={totalRemaining}
          icon="🏦"
          color={totalRemaining < 0 ? "red" : "green"}
        />
      </div>

      {/* Budget Categories */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Budget Categories
          </h3>
          
          {budgetData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No budget categories yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Add categories using the ingest API
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {budgetData.map((category) => (
                <BudgetCategoryRow key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Data ingestion info */}
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <h3 className="text-lg font-medium text-green-900 mb-2">Budget Data Ingestion</h3>
        <p className="text-sm text-green-700 mb-2">
          Send budget data to: <code className="bg-green-100 px-1 py-0.5 rounded">/api/ingest</code>
        </p>
        <div className="text-xs text-green-600 font-mono bg-green-100 p-2 rounded space-y-1">
          <div>POST /api/ingest</div>
          <div>Headers: x-api-key, x-user-id</div>
          <div>Set target: {`{"type": "budget", "data": {"category": "Groceries", "amount": 500, "action": "set"}}`}</div>
          <div>Add expense: {`{"type": "budget", "data": {"category": "Groceries", "amount": 45.50}}`}</div>
        </div>
      </div>
    </div>
  );
}

interface BudgetOverviewCardProps {
  title: string;
  amount: number;
  icon: string;
  color: 'blue' | 'green' | 'red';
}

function BudgetOverviewCard({ title, amount, icon, color }: BudgetOverviewCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200'
  } as const;

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div className="text-2xl">{icon}</div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            ${amount.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-900">{title}</p>
      </div>
    </div>
  );
}

interface BudgetCategoryRowProps {
  category: BudgetCategory;
}

function BudgetCategoryRow({ category }: BudgetCategoryRowProps) {
  const remaining = category.target_amount - category.spent_amount;
  const percentSpent = category.target_amount > 0 
    ? (category.spent_amount / category.target_amount) * 100 
    : 0;

  const getStatusColor = () => {
    if (percentSpent <= 70) return 'bg-green-500';
    if (percentSpent <= 90) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-gray-900">{category.name}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          remaining >= 0 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {remaining >= 0 ? `$${remaining.toFixed(2)} left` : `$${Math.abs(remaining).toFixed(2)} over`}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Spent: ${category.spent_amount.toFixed(2)}</span>
          <span>Target: ${category.target_amount.toFixed(2)}</span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${getStatusColor()}`}
            style={{ width: `${Math.min(percentSpent, 100)}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-gray-500">
          {percentSpent.toFixed(1)}% of budget used
        </div>
      </div>
    </div>
  );
}
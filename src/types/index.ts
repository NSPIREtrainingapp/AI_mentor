export interface HealthData {
  id: string;
  user_id: string;
  date: string;
  sleep_hours?: number;
  steps?: number;
  glucose?: number;
  calories?: number;
  protein?: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  spent_amount: number;
  month: string; // YYYY-MM format
  created_at: string;
  updated_at: string;
}

export interface IngestData {
  type: 'health' | 'budget';
  data: {
    // Health data
    sleep_hours?: number;
    steps?: number;
    glucose?: number;
    calories?: number;
    protein?: number;
    
    // Budget data
    category?: string;
    amount?: number;
    month?: string;
    action?: 'add' | 'set'; // add to spent or set target
  };
}
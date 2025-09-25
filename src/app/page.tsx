'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
    </AuthProvider>
  );
}

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormProps {
  onSubmit: (email: string) => void;
  loading: boolean;
  message: string;
}

function LoginForm({ onSubmit, loading, message }: LoginFormProps) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onSubmit(email.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            AI Mentor Hub
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your personal dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="relative block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </div>

          {message && (
            <div className="text-center text-sm text-gray-600 bg-blue-50 p-3 rounded-md">
              {message}
            </div>
          )}
        </form>

        <div className="text-xs text-gray-500 text-center">
          <p>We&apos;ll send you a secure magic link to sign in</p>
          <p>No password required</p>
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signIn } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignIn = async (email: string) => {
    setLoginLoading(true);
    setMessage('');
    
    const { error } = await signIn(email);
    
    if (error) {
      setMessage('Error sending magic link. Please try again.');
      console.error('Sign in error:', error);
    } else {
      setMessage('Magic link sent! Check your email to sign in.');
    }
    
    setLoginLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginForm
        onSubmit={handleSignIn}
        loading={loginLoading}
        message={message}
      />
    );
  }

  return <>{children}</>;
}
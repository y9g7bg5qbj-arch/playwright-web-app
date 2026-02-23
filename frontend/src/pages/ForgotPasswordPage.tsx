import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/api/auth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
    } catch {
      // Silently handle — we always show success to prevent enumeration
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-text-primary">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-status-success/10 border border-status-success/30 p-4">
              <p className="text-sm text-status-success">
                If an account exists with that email, a password reset link has been sent. Check your inbox.
              </p>
            </div>
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-border-default bg-dark-card placeholder-text-muted text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-accent-blue hover:bg-accent-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const successMessage = (location.state as any)?.message;

  const formatLoginError = (err: unknown): string => {
    const message = err instanceof Error ? err.message : 'Login failed';
    const isServerUnavailable =
      message.includes('Server is temporarily unavailable')
      || message.includes('Unable to reach the server')
      || message.includes('Server returned an invalid response');

    if (isServerUnavailable) {
      return `${message} In local dev, start backend with: cd backend && npm run dev`;
    }

    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(formatLoginError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            Vero IDE
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="rounded-lg bg-status-success/10 border border-status-success/30 p-4">
              <p className="text-sm text-status-success">{successMessage}</p>
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-accent-red/10 border border-accent-red/30 p-4">
              <p className="text-sm text-accent-red">{error}</p>
            </div>
          )}
          <div className="rounded-lg shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-border-default bg-dark-card placeholder-text-muted text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-border-default bg-dark-card placeholder-text-muted text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue sm:text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-accent-blue hover:bg-accent-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-accent-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Forgot password?
            </Link>
            <Link
              to="/register"
              className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors"
            >
              Create account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

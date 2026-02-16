// Auth imports - commented out while auth is bypassed for testing
// import { Navigate } from 'react-router-dom';
// import { useAuthStore } from '@/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Bypass auth for testing
  /*
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-canvas">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-status-info"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  */

  return <>{children}</>;
}

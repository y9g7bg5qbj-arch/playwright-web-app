import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VeroWorkspace } from './components/workspace';
import { ExecutionReportPage } from './pages/ExecutionReportPage';
import { ExecutionHistoryPage } from './pages/ExecutionHistoryPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Main unified workspace - default route */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <VeroWorkspace />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Execution detail pages (need separate routes for deep linking) */}
        <Route
          path="/execution/:executionId"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ExecutionReportPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/test-flow/:testFlowId/executions"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ExecutionHistoryPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Legacy route redirects - all go to unified workspace */}
        <Route path="/workspace" element={<Navigate to="/" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/editor" element={<Navigate to="/" replace />} />
        <Route path="/ide" element={<Navigate to="/" replace />} />
        <Route path="/executions" element={<Navigate to="/" replace />} />
        <Route path="/data" element={<Navigate to="/" replace />} />
        <Route path="/schedules" element={<Navigate to="/" replace />} />
        <Route path="/copilot" element={<Navigate to="/" replace />} />
        <Route path="/scenarios" element={<Navigate to="/" replace />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VeroIDE } from './components/vero';
import { ExecutionReportPage } from './pages/ExecutionReportPage';
import { ExecutionHistoryPage } from './pages/ExecutionHistoryPage';
import { ScenarioDashboard } from './components/ScenarioDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  const { checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Main IDE Route - VeroIDE is the primary IDE */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <VeroIDE />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Scenario Dashboard */}
        <Route
          path="/scenarios"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ScenarioDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Execution pages */}
        <Route
          path="/test-flow/:testFlowId/executions"
          element={
            <ProtectedRoute>
              <ExecutionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/execution/:executionId"
          element={
            <ProtectedRoute>
              <ExecutionReportPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

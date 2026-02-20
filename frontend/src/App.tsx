import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VeroWorkspace } from './components/workspace';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ui';
import { TestDataCanvasMockPage } from './components/TestData/canvas-v2';

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

        {/* Test-data canvas v2 mock route */}
        <Route
          path="/mock/test-data-canvas"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <TestDataCanvasMockPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

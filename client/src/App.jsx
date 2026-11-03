import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { PlanDetailPage } from './pages/PlanDetailPage';
import { BrowsePage } from './pages/BrowsePage';
import { SavedPlansPage } from './pages/SavedPlansPage';
import { AdminPage } from './pages/admin/AdminPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectsPage, ConsultationPage } from './pages/ProjectsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';
import { AuthCallbackPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AccountPages';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset" element={<ResetPasswordPage />} />

              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/plans/:id" element={<PlanDetailPage />} />

              <Route element={<ProtectedRoute />}>
              <Route path="/" element={<ProjectsPage />} />
              <Route path="/catalogue-search" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ConsultationPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/saved" element={<SavedPlansPage />} />
              </Route>

              <Route element={<ProtectedRoute adminOnly />}>
              <Route path="/admin" element={<AdminPage />} />
              </Route>

              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

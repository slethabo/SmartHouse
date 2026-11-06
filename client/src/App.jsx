import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, GuestRoute } from './components/ProtectedRoute';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RecommendationsPage = lazy(() => import('./pages/RecommendationsPage'));
const PlanDetailPage = lazy(() => import('./pages/PlanDetailPage'));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const SavedPlansPage = lazy(() => import('./pages/SavedPlansPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ConsultationPage = lazy(() => import('./pages/ProjectsPage').then((module) => ({ default: module.ConsultationPage })));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AuthCallbackPage = lazy(() => import('./pages/AccountPages').then((module) => ({ default: module.AuthCallbackPage })));
const ForgotPasswordPage = lazy(() => import('./pages/AccountPages').then((module) => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/AccountPages').then((module) => ({ default: module.ResetPasswordPage })));

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<div className="page-loading" role="status">Loading page...</div>}>
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
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

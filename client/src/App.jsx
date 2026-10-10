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

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />

              {/* All prototype screens use the shared workspace. */}
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/plans/:id" element={<PlanDetailPage />} />

              <Route path="/" element={<ProjectsPage />} />
              <Route path="/catalogue-search" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/:id" element={<ConsultationPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/saved" element={<SavedPlansPage />} />

              <Route path="/admin" element={<AdminPage />} />

              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/AppLayout';
import { ToastContainer } from './components/ui';

import { LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthPages';

import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ClientsPage } from './pages/admin/ClientsPage';
import { ProjectsPage } from './pages/admin/ProjectsPage';
import { TasksPage } from './pages/admin/TasksPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { InvoicesPage } from './pages/admin/InvoicesPage';
import { TeamPage } from './pages/admin/TeamPage';
import { ActivityPage, SettingsPage } from './pages/admin/ActivityAndSettings';

import {
  ProfessionalDashboard, ProfessionalTasksPage, ProfessionalProjectsPage,
  ProfessionalReportsPage, ProfessionalSettingsPage
} from './pages/professional/ProfessionalPages';

import {
  ClientDashboard, ClientProjectsPage, ClientReportsPage,
  ClientInvoicesPage, ClientSettingsPage
} from './pages/client/ClientPages';

import { MessagesPage } from './pages/MessagesPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    const r = user.role === 'admin' ? '/admin' : user.role === 'professional' ? '/professional' : '/client';
    return <Navigate to={r} replace />;
  }
  return <AppLayout>{children}</AppLayout>;
};

const RootRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'professional') return <Navigate to="/professional" replace />;
  return <Navigate to="/client" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Admin */}
          <Route path="/admin"           element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/clients"   element={<ProtectedRoute roles={['admin']}><ClientsPage /></ProtectedRoute>} />
          <Route path="/admin/projects"  element={<ProtectedRoute roles={['admin']}><ProjectsPage /></ProtectedRoute>} />
          <Route path="/admin/tasks"     element={<ProtectedRoute roles={['admin']}><TasksPage /></ProtectedRoute>} />
          <Route path="/admin/reports"   element={<ProtectedRoute roles={['admin']}><ReportsPage /></ProtectedRoute>} />
          <Route path="/admin/invoices"  element={<ProtectedRoute roles={['admin']}><InvoicesPage /></ProtectedRoute>} />
          <Route path="/admin/team"      element={<ProtectedRoute roles={['admin']}><TeamPage /></ProtectedRoute>} />
          <Route path="/admin/activity"  element={<ProtectedRoute roles={['admin']}><ActivityPage /></ProtectedRoute>} />
          <Route path="/admin/settings"  element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
          <Route path="/admin/messages"  element={<ProtectedRoute roles={['admin']}><MessagesPage /></ProtectedRoute>} />

          {/* Professional */}
          <Route path="/professional"          element={<ProtectedRoute roles={['professional','admin']}><ProfessionalDashboard /></ProtectedRoute>} />
          <Route path="/professional/projects" element={<ProtectedRoute roles={['professional','admin']}><ProfessionalProjectsPage /></ProtectedRoute>} />
          <Route path="/professional/tasks"    element={<ProtectedRoute roles={['professional','admin']}><ProfessionalTasksPage /></ProtectedRoute>} />
          <Route path="/professional/reports"  element={<ProtectedRoute roles={['professional','admin']}><ProfessionalReportsPage /></ProtectedRoute>} />
          <Route path="/professional/settings" element={<ProtectedRoute roles={['professional','admin']}><ProfessionalSettingsPage /></ProtectedRoute>} />
          <Route path="/professional/messages" element={<ProtectedRoute roles={['professional','admin']}><MessagesPage /></ProtectedRoute>} />

          {/* Client */}
          <Route path="/client"          element={<ProtectedRoute roles={['client','admin']}><ClientDashboard /></ProtectedRoute>} />
          <Route path="/client/projects" element={<ProtectedRoute roles={['client','admin']}><ClientProjectsPage /></ProtectedRoute>} />
          <Route path="/client/reports"  element={<ProtectedRoute roles={['client','admin']}><ClientReportsPage /></ProtectedRoute>} />
          <Route path="/client/invoices" element={<ProtectedRoute roles={['client','admin']}><ClientInvoicesPage /></ProtectedRoute>} />
          <Route path="/client/settings" element={<ProtectedRoute roles={['client','admin']}><ClientSettingsPage /></ProtectedRoute>} />
          <Route path="/client/messages" element={<ProtectedRoute roles={['client','admin']}><MessagesPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}

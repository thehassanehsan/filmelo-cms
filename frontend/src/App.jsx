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
import { ProfessionalEarningsDashboard } from './pages/admin/ProfessionalEarningsDashboard';
import { MorePage } from './pages/admin/MorePage';
import { ExportPage } from './pages/admin/ExportPage';

import {
  ProfessionalDashboard, ProfessionalTasksPage, ProfessionalProjectsPage,
  ProfessionalReportsPage, ProfessionalSettingsPage
} from './pages/professional/ProfessionalPages';

import {
  ClientDashboard, ClientProjectsPage, ClientReportsPage,
  ClientInvoicesPage, ClientSettingsPage, ClientDeliverablesPage
} from './pages/client/ClientPages';

import { MessagesPage }     from './pages/MessagesPage';
import { TeamChatPage }     from './pages/TeamChatPage';
import { DrivePage }        from './pages/DrivePage';
import { DailyReportsPage } from './pages/DailyReportsPage';
import { DeliverablesPage } from './pages/DeliverablesPage';
import { SalesPipelinePage } from './pages/SalesPipelinePage';
import { AccountingPage }   from './pages/AccountingPage';
import { EarningsPage }     from './pages/EarningsPage';

const PR = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg"/></div>;
  if (!user)   return <Navigate to="/login" replace/>;
  if (roles && !roles.includes(user.role)) {
    const r = user.role==='admin'?'/admin':user.role==='professional'?'/professional':'/client';
    return <Navigate to={r} replace/>;
  }
  return <AppLayout>{children}</AppLayout>;
};

const Root = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg"/></div>;
  if (!user) return <Navigate to="/login" replace/>;
  if (user.role==='admin') return <Navigate to="/admin" replace/>;
  if (user.role==='professional') return <Navigate to="/professional" replace/>;
  return <Navigate to="/client" replace/>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root/>}/>
          <Route path="/login"           element={<LoginPage/>}/>
          <Route path="/register"        element={<RegisterPage/>}/>
          <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
          <Route path="/reset-password"  element={<ResetPasswordPage/>}/>

          {/* ── ADMIN ── */}
          <Route path="/admin"                  element={<PR roles={['admin']}><AdminDashboard/></PR>}/>
          <Route path="/admin/clients"          element={<PR roles={['admin']}><ClientsPage/></PR>}/>
          <Route path="/admin/projects"         element={<PR roles={['admin']}><ProjectsPage adminView={true}/></PR>}/>
          <Route path="/admin/tasks"            element={<PR roles={['admin']}><TasksPage role="admin"/></PR>}/>
          <Route path="/admin/reports"          element={<PR roles={['admin']}><ReportsPage/></PR>}/>
          <Route path="/admin/invoices"         element={<PR roles={['admin']}><InvoicesPage/></PR>}/>
          <Route path="/admin/team"             element={<PR roles={['admin']}><TeamPage/></PR>}/>
          <Route path="/admin/activity"         element={<PR roles={['admin']}><ActivityPage/></PR>}/>
          <Route path="/admin/settings"         element={<PR roles={['admin']}><SettingsPage/></PR>}/>
          <Route path="/admin/messages"         element={<PR roles={['admin']}><MessagesPage/></PR>}/>
          <Route path="/admin/teamchat"         element={<PR roles={['admin']}><TeamChatPage/></PR>}/>
          <Route path="/admin/drive"            element={<PR roles={['admin']}><DrivePage/></PR>}/>
          <Route path="/admin/dailyreports"     element={<PR roles={['admin']}><DailyReportsPage/></PR>}/>
          <Route path="/admin/deliverables"     element={<PR roles={['admin']}><DeliverablesPage/></PR>}/>
          <Route path="/admin/sales"            element={<PR roles={['admin']}><SalesPipelinePage/></PR>}/>
          <Route path="/admin/accounting"       element={<PR roles={['admin']}><AccountingPage/></PR>}/>
          <Route path="/admin/earnings"         element={<PR roles={['admin']}><ProfessionalEarningsDashboard/></PR>}/>

          <Route path="/admin/more"         element={<PR roles={['admin']}><MorePage/></PR>}/>
          <Route path="/admin/export"       element={<PR roles={['admin']}><ExportPage/></PR>}/>

          {/* ── PROFESSIONAL ── */}
          <Route path="/professional"                element={<PR roles={['professional','admin']}><ProfessionalDashboard/></PR>}/>
          <Route path="/professional/projects"       element={<PR roles={['professional','admin']}><ProfessionalProjectsPage/></PR>}/>
          <Route path="/professional/tasks"          element={<PR roles={['professional','admin']}><ProfessionalTasksPage/></PR>}/>
          <Route path="/professional/reports"        element={<PR roles={['professional','admin']}><ProfessionalReportsPage/></PR>}/>
          <Route path="/professional/settings"       element={<PR roles={['professional','admin']}><ProfessionalSettingsPage/></PR>}/>
          <Route path="/professional/messages"       element={<PR roles={['professional','admin']}><MessagesPage/></PR>}/>
          <Route path="/professional/teamchat"       element={<PR roles={['professional','admin']}><TeamChatPage/></PR>}/>
          <Route path="/professional/drive"          element={<PR roles={['professional','admin']}><DrivePage/></PR>}/>
          <Route path="/professional/dailyreports"   element={<PR roles={['professional','admin']}><DailyReportsPage/></PR>}/>
          <Route path="/professional/deliverables"   element={<PR roles={['professional','admin']}><DeliverablesPage/></PR>}/>
          <Route path="/professional/earnings"       element={<PR roles={['professional','admin']}><EarningsPage/></PR>}/>

          {/* ── CLIENT — No Drive, No TeamChat, No financial amounts ── */}
          <Route path="/client"                element={<PR roles={['client','admin']}><ClientDashboard/></PR>}/>
          <Route path="/client/projects"       element={<PR roles={['client','admin']}><ClientProjectsPage/></PR>}/>
          <Route path="/client/reports"        element={<PR roles={['client','admin']}><ClientReportsPage/></PR>}/>
          <Route path="/client/invoices"       element={<PR roles={['client','admin']}><ClientInvoicesPage/></PR>}/>
          <Route path="/client/settings"       element={<PR roles={['client','admin']}><ClientSettingsPage/></PR>}/>
          <Route path="/client/messages"       element={<PR roles={['client','admin']}><MessagesPage/></PR>}/>
          <Route path="/client/deliverables"   element={<PR roles={['client','admin']}><ClientDeliverablesPage/></PR>}/>

          <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>
        <ToastContainer/>
      </BrowserRouter>
    </AuthProvider>
  );
}

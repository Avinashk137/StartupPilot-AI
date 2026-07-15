import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/providers/auth-provider'
import { PrintProvider } from '@/providers/PrintProvider'
import { ThemeProvider } from '@/providers/theme-provider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Toaster } from 'sonner'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Dashboard
import DashboardPage from '@/pages/dashboard/DashboardPage'

// Projects
import ProjectsListPage from '@/pages/projects/ProjectsListPage'
import CreateProjectPage from '@/pages/projects/CreateProjectPage'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'

// Project Reports
import ResearchReportPage from '@/pages/projects/reports/ResearchReportPage'
import CompetitorReportPage from '@/pages/projects/reports/CompetitorReportPage'
import BusinessPlanReportPage from '@/pages/projects/reports/BusinessPlanReportPage'
import FinancialReportPage from '@/pages/projects/reports/FinancialReportPage'
import MarketingReportPage from '@/pages/projects/reports/MarketingReportPage'

// Other Pages
import AgentsPage from '@/pages/agents/AgentsPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import ExportsPage from '@/pages/exports/ExportsPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import ProfilePage from '@/pages/profile/ProfilePage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <PrintProvider>
          <AuthProvider>
            <BrowserRouter>
              <Toaster position="top-right" closeButton duration={4000} />
              <Routes>
                {/* Initial Route */}
                <Route path="/" element={<Navigate to="/login" replace />} />

                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                {/* Protected Dashboard Routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Projects */}
                  <Route path="/projects" element={<ProjectsListPage />} />
                  <Route path="/projects/new" element={<CreateProjectPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />

                  {/* Project Reports */}
                  <Route path="/projects/:id/reports" element={<RedirectToReports />} />
                  <Route path="/projects/:id/reports/research" element={<ResearchReportPage />} />
                  <Route path="/projects/:id/reports/competitor" element={<CompetitorReportPage />} />
                  <Route path="/projects/:id/reports/business-plan" element={<BusinessPlanReportPage />} />
                  <Route path="/projects/:id/reports/financial" element={<FinancialReportPage />} />
                  <Route path="/projects/:id/reports/marketing" element={<MarketingReportPage />} />

                  {/* Other */}
                  <Route path="/agents" element={<AgentsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/exports" element={<ExportsPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </PrintProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function RedirectToReports() {
  const { id } = useParams()
  return <Navigate to={`/projects/${id}?tab=reports`} replace />
}

export default App


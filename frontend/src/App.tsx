import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/providers/auth-provider'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'

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
import AdvertisementReportPage from '@/pages/projects/reports/AdvertisementReportPage'
import AnalyticsReportPage from '@/pages/projects/reports/AnalyticsReportPage'

// Other Pages
import AgentsPage from '@/pages/agents/AgentsPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Dashboard Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Projects */}
              <Route path="projects" element={<ProjectsListPage />} />
              <Route path="projects/new" element={<CreateProjectPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />

              {/* Project Reports */}
              <Route path="projects/:id/reports/research" element={<ResearchReportPage />} />
              <Route path="projects/:id/reports/competitor" element={<CompetitorReportPage />} />
              <Route path="projects/:id/reports/business-plan" element={<BusinessPlanReportPage />} />
              <Route path="projects/:id/reports/finance" element={<FinancialReportPage />} />
              <Route path="projects/:id/reports/marketing" element={<MarketingReportPage />} />
              <Route path="projects/:id/reports/advertisement" element={<AdvertisementReportPage />} />
              <Route path="projects/:id/reports/analytics" element={<AnalyticsReportPage />} />

              {/* Other */}
              <Route path="agents" element={<AgentsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="exports" element={<ExportsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App

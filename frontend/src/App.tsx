import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary } from './components/common'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import UnauthorizedPage from './pages/errors/UnauthorizedPage'
import NotFoundPage from './pages/errors/NotFoundPage'
import Dashboard from './pages/dashboard/Dashboard'
import SEOPage from './pages/seo/SEOPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import AdsPage from './pages/ads/AdsPage'
import GBPPage from './pages/gbp/GBPPage'
import SettingsPage from './pages/settings/SettingsPage'
import AccountsPage from './pages/settings/AccountsPage'
import OAuthCallbackPage from './pages/oauth/OAuthCallbackPage'
import ShareLinksPage from './pages/settings/ShareLinksPage'
import SharedDashboardPage from './pages/public/SharedDashboardPage'

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
        <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/seo"
          element={
            <ProtectedRoute>
              <Layout>
                <SEOPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Layout>
                <AnalyticsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/ads"
          element={
            <ProtectedRoute>
              <Layout>
                <AdsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/gbp"
          element={
            <ProtectedRoute>
              <Layout>
                <GBPPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <Layout>
                <AccountsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/share-links"
          element={
            <ProtectedRoute>
              <Layout>
                <ShareLinksPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        {/* Rutas públicas OAuth */}
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        
        {/* Dashboard público compartido (sin autenticación) */}
        <Route path="/shared/:token" element={<SharedDashboardPage />} />
        
        {/* Rutas de error */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App


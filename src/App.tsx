import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import TreeProfilePage from './pages/TreeProfilePage'
import AddTreePage from './pages/AddTreePage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'

// Auth callback page for OAuth (e.g. Google)
const AuthCallbackPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Authenticating...</p>
    </div>
  )
}

// Sync document.dir with stored language preference on initial load
function DirectionSync() {
  useEffect(() => {
    const lang = localStorage.getItem('language') ?? 'he'
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [])
  return null
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <DirectionSync />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trees/new"
            element={
              <ProtectedRoute>
                <AddTreePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trees/:id"
            element={
              <ProtectedRoute>
                <TreeProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Default redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

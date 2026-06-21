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
  useEffect(() => {
    // Supabase handles the token exchange automatically via onAuthStateChange
    // Just redirect to dashboard after a short delay
    const timer = setTimeout(() => {
      window.location.href = '/dashboard'
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-green-800 text-sm">Authenticating...</p>
      </div>
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

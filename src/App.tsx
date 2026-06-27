import React, { useEffect, useState, Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { supabase } from './lib/supabase-client'
import ProtectedRoute from './components/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import TreeProfilePage from './pages/TreeProfilePage'
import AddTreePage from './pages/AddTreePage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'

// Global Error Boundary to catch runtime crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
          <h1 style={{ color: 'red' }}>⚠️ Application Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Auth callback page for OAuth (e.g. Google)
const AuthCallbackPage: React.FC = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        // Small delay to ensure session is persisted
        setTimeout(() => { window.location.href = '/dashboard' }, 500)
        return
      }
      // Listen for auth change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          setReady(true)
          setTimeout(() => { window.location.href = '/dashboard' }, 500)
        }
      })
      // Fallback
      setTimeout(() => {
        subscription.unsubscribe()
        window.location.href = '/dashboard'
      }, 10000)
    }
    checkSession()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f7f4]">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-green-800 text-sm">
          {ready ? 'מתחבר...' : 'מאמת...'}
        </p>
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}

export default App

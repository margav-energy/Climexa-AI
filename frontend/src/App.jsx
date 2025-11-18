import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import FarmerDashboard from './pages/FarmerDashboard'
import ClimexaDashboard from './pages/ClimexaDashboard'
import Login from './pages/Login'
import SimulationView from './pages/SimulationView'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/login" />
  }
  
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" />
  }
  
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/farmer"
        element={
          <ProtectedRoute requiredRole="farmer">
            <FarmerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/climexa"
        element={
          <ProtectedRoute requiredRole="climexa_staff">
            <ClimexaDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulation"
        element={
          <ProtectedRoute>
            <SimulationView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          user ? (
            user.role === 'farmer' ? (
              <Navigate to="/farmer" />
            ) : (
              <Navigate to="/climexa" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App


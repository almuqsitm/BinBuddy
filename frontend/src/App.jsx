import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import Login from './pages/Login'
import JanitorDashboard from './pages/JanitorDashboard'

// Placeholders for now - we will build these files next!
const SupervisorDashboard = () => <div className="p-10 text-2xl font-bold text-blue-600">Supervisor Dashboard</div>

// Protected Route Wrapper
// This checks if the user has a role. If not, kicks them back to Login.
const ProtectedRoute = ({ children, allowedRole }) => {
  const userRole = useStore((state) => state.userRole)
  
  if (!userRole) {
    return <Navigate to="/" replace />
  }

  // Optional: Strict Role Checking (prevent Janitor from seeing Supervisor page)
  // if (allowedRole && userRole !== allowedRole) {
  //   return <Navigate to="/" replace />
  // }

  return children
}

const App = () => {
  const { userRole, checkSession } = useStore()

  useEffect(() => {
    checkSession()
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route: Login */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes */}
        <Route 
          path="/janitor" 
          element={
            userRole === 'janitor' ? <JanitorDashboard /> : <Navigate to="/" />
          } 
        />
        
        <Route 
          path="/supervisor" 
          element={
            <ProtectedRoute allowedRole="supervisor">
              <SupervisorDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

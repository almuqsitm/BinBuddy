import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import Login from './pages/Login'

// Placeholders for now - we will build these files next!
const JanitorDashboard = () => <div className="p-10 text-2xl font-bold text-green-600">Janitor Dashboard</div>
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route: Login */}
        <Route path="/" element={<Login />} />

        {/* Protected Routes */}
        <Route 
          path="/janitor" 
          element={
            <ProtectedRoute allowedRole="janitor">
              <JanitorDashboard />
            </ProtectedRoute>
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

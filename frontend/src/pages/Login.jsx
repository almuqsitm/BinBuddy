import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { User, ClipboardList } from 'lucide-react'

const Login = () => {
  const navigate = useNavigate()
  const setRole = useStore((state) => state.setRole)

  const handleLogin = (role) => {
    // 1. Update Global Store
    setRole(role)
    
    // 2. Navigate to the correct URL
    if (role === 'janitor') {
      navigate('/janitor')
    } else {
      navigate('/supervisor')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Welcome to BinBuddy</h1>
        <div className="space-y-4">
          <button 
            onClick={() => handleLogin('janitor')}
            className="w-full py-4 bg-green-100 text-green-700 font-bold rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <User size={24} />
            Login as Janitor
          </button>
          <button 
            onClick={() => handleLogin('supervisor')}
            className="w-full py-4 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <ClipboardList size={24} />
            Login as Supervisor
          </button>
        </div>
      </div>
    </div>
  )
}

export default Login

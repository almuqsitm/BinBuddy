import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { User, Briefcase, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const LoginForm = () => {
  const navigate = useNavigate()
  const { login, signup } = useStore() 

  const [isSignUp, setIsSignUp] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form State
  const [role, setRole] = useState('janitor')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    let success = false
    if (isSignUp) {
      success = await signup(email, password, role, firstName, lastName)
    } else {
      success = await login(email, password)
    }

    setIsLoading(false)
    
    if (success) {
      if (role === 'janitor') navigate('/janitor')
      else navigate('/supervisor')
    }
  }

  return (
    <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl w-full max-w-md border border-gray-100 transition-all">
      
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">BinBuddy</h1>
        <p className="text-gray-500 font-medium">
          {isSignUp ? "Create your account" : "Welcome back, team!"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Sign Up Fields */}
        {isSignUp && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex gap-2">
            <div className="relative flex-1">
              <User className="absolute left-4 top-3.5 text-gray-400" size={20}/>
              <input 
                type="text" required 
                placeholder="First Name"
                value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
            <div className="relative flex-1">
              <User className="absolute left-4 top-3.5 text-gray-400" size={20}/>
              <input 
                type="text" required 
                placeholder="Last Name"
                value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              />
            </div>
          </div>
        )}

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-4 top-3.5 text-gray-400" size={20}/>
          <input 
            type="email" required 
            placeholder="Email Address"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-4 top-3.5 text-gray-400" size={20}/>
          <input 
            type="password" required 
            placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full pl-12 p-3.5 bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>

        {/* Role Selection */}
        <div className="p-1.5 bg-gray-100 rounded-xl flex gap-1">
            <button
              type="button"
              onClick={() => setRole('janitor')}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                role === 'janitor' ? 'bg-white shadow-sm text-black scale-100' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <User size={18}/> Janitor
            </button>
            <button
              type="button"
              onClick={() => setRole('supervisor')}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200",
                role === 'supervisor' ? 'bg-white shadow-sm text-black scale-100' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Briefcase size={18}/> Supervisor
            </button>
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-200"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : (
            <>
              {isSignUp ? "Create Account" : "Sign In"} <ArrowRight size={20} />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center pt-6 border-t border-gray-100">
        <p className="text-sm text-gray-500">
          {isSignUp ? "Already have an account?" : "New to BinBuddy?"}
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 font-bold text-black hover:underline"
          >
            {isSignUp ? "Log In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  )
}

export default LoginForm

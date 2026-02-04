import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle, Shield, Users } from 'lucide-react'

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-black tracking-tighter">BinBuddy</h1>
        <Link 
          to="/login"
          className="px-6 py-2.5 rounded-full bg-black text-white font-bold text-sm hover:bg-gray-800 transition-all"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center md:pt-24 lg:pt-32">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900">
          Simplify Your <br />
          <span className="text-green-600">Janitorial Workflow</span>
        </h1>
        
        <p className="max-w-2xl mx-auto text-xl text-gray-500 mb-10 leading-relaxed">
          The all-in-one assistant for janitorial teams. Assign tasks, track progress, 
          and connect supervisors with staff effortlessly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/login"
            className="w-full sm:w-auto px-8 py-4 bg-green-600 text-white rounded-2xl font-bold text-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-green-100"
          >
            Get Started <ArrowRight size={20} />
          </Link>
          <button className="w-full sm:w-auto px-8 py-4 bg-gray-50 text-gray-900 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all border border-gray-100">
            Learn More
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 text-left">
           <div className="p-8 bg-green-50/50 rounded-3xl hover:bg-green-50 transition-colors border border-transparent hover:border-green-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 text-green-600">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Smart Checklists</h3>
              <p className="text-gray-500">Digital task lists that make cleaning routines clear, efficient, and trackable.</p>
           </div>
           <div className="p-8 bg-green-50/50 rounded-3xl hover:bg-green-50 transition-colors border border-transparent hover:border-green-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 text-green-600">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Team Sync</h3>
              <p className="text-gray-500">Connect supervisors and janitors with simple Friend Codes. No complex setup.</p>
           </div>
           <div className="p-8 bg-green-50/50 rounded-3xl hover:bg-green-50 transition-colors border border-transparent hover:border-green-100">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 text-green-600">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">Reliable Data</h3>
              <p className="text-gray-500">Real-time updates and secure data storage using Supabase technology.</p>
           </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 text-center text-gray-400 text-sm">
        &copy; 2026 BinBuddy. All rights reserved.
      </footer>
    </div>
  )
}

export default LandingPage

import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { useStore } from '../store/useStore'

const Navbar = ({ title = "BinBuddy" }) => {
  const { currentUser, logout } = useStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-50 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
      
      <div className="flex items-center gap-4">
        {currentUser && (
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-gray-900">{currentUser.first_name} {currentUser.last_name}</p>
            {currentUser.friend_code && (
               <p className="text-xs text-brand-600 font-mono bg-blue-50 px-2 py-0.5 rounded inline-block text-blue-600">
                 Code: {currentUser.friend_code}
               </p>
            )}
          </div>
        )}

        {/* User Profile Avatar with Logout */}
        <div className="relative group">
           <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-200 transition-colors">
              <User size={20} className="text-gray-600" />
           </button>
           
           {/* Simple Hover Dropdown for Logout */}
           <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg p-2 invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all transform origin-top-right z-50">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 w-full p-2 text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg text-left"
              >
                <LogOut size={16} /> Sign Out
              </button>
           </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar

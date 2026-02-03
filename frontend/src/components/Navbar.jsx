import React from 'react'
import { User } from 'lucide-react'
import { useStore } from '../store/useStore'

const Navbar = ({ title = "BinBuddy" }) => {
  const { currentUser } = useStore() // Assume we can get user from store

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

        {/* User Profile Avatar */}
        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
            <User size={20} className="text-gray-600" />
        </div>
      </div>
    </header>
  )
}

export default Navbar

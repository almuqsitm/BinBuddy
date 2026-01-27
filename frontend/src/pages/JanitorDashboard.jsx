import React, { useState, useEffect } from 'react'
// import { useStore } from '../store/useStore'
import { Check, SprayCan, Trash2, Utensils, LayoutDashboard, ListTodo, Settings, User } from 'lucide-react'
import clsx from 'clsx'

const JanitorDashboard = () => {
  // const { tasks, fetchTasks, toggleTask, isLoading } = useStore()
  
  // FIXME: Hardcoded tasks for visual demo (User Request)
  // Backend logic is commented out above.
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Clean Table', is_completed: false }, 
    { id: 2, title: 'Clean Bathroom', is_completed: false }, 
    { id: 3, title: 'Collect Garbage', is_completed: false },
  ])
  const isLoading = false

  const toggleTask = (id) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, is_completed: !task.is_completed } : task
    ))
  }

  // Helper to pick color/icon based on title
  const getTaskStyles = (title, isCompleted) => {
    const lower = title.toLowerCase()
    
    // Base styles
    let icon = <Check size={24} />
    let colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-200"
    
    if (lower.includes('table') || lower.includes('clean')) {
      icon = <Check size={24} />
      colorClass = "bg-green-100 text-green-800 border-green-300 hover:bg-green-200"
    } 
    else if (lower.includes('bathroom') || lower.includes('wash')) {
      icon = <SprayCan size={24} />
      colorClass = "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200"
    }
    else if (lower.includes('garbage') || lower.includes('trash')) {
      icon = <Trash2 size={24} />
      colorClass = "bg-red-100 text-red-800 border-red-300 hover:bg-red-200"
    }

    if (isCompleted) {
       return { icon: <Check size={28} strokeWidth={3} />, className: "bg-green-500 text-white shadow-inner scale-95" }
    }

    return { icon, className: clsx("border-2 shadow-sm transition-all active:scale-95", colorClass) }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* TOP NAVBAR */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-1000">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">BinBuddy</h1>
        
        <div className="flex items-center gap-4">
           {/* User Profile */}
           <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
              <User size={20} className="text-gray-600" />
           </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* SIDEBAR */}
        <aside className="w-64 border-r border-gray-100 p-4 hidden md:flex flex-col gap-2 bg-white h-[calc(100vh-65px)] sticky top-[65px]">
          <button className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button className="flex items-center gap-3 w-full p-3 rounded-xl bg-blue-50 text-blue-600 font-bold transition-colors">
            <ListTodo size={20} /> Tasks
          </button>
          <button className="flex items-center gap-3 w-full p-3 rounded-xl text-gray-500 hover:bg-gray-50 font-medium transition-colors">
            <Settings size={20} /> Settings
          </button>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 md:p-10 bg-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Start your cleaning task</h2>

          <div className="flex flex-col gap-4 max-w-xl">
            {isLoading && tasks.length === 0 ? (
               <div className="animate-pulse space-y-4">
                  <div className="h-16 bg-gray-100 rounded-2xl w-full"></div>
                  <div className="h-16 bg-gray-100 rounded-2xl w-full"></div>
                  <div className="h-16 bg-gray-100 rounded-2xl w-full"></div>
               </div>
            ) : tasks.length > 0 ? (
              tasks.map((task) => {
                const style = getTaskStyles(task.title, task.is_completed)
                return (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={clsx(
                      "w-full p-4 rounded-2xl flex items-center gap-6 text-left transition-all duration-200",
                      style.className
                    )}
                  >
                    <div className={clsx(
                      "w-12 h-12 rounded-full flex items-center justify-center bg-white/30 backdrop-blur-sm shadow-sm",
                      task.is_completed ? "text-green-600 bg-white" : "text-inherit"
                    )}>
                      {style.icon}
                    </div>
                    
                    <span className="text-lg font-bold flex-1">{task.title}</span>
                  </button>
                )
              })
            ) : (
               <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-gray-400">No tasks assigned yet.</p>
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default JanitorDashboard

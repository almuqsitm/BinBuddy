import React, { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { Plus, UserPlus, Users, Trash2, CheckCircle, XCircle } from 'lucide-react'

const SupervisorDashboard = () => {
  const { team, tasks, fetchTeam, connectJanitor, addTask, currentUser, login } = useStore()
  
  // Local state for forms
  const [friendCode, setFriendCode] = useState('')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [selectedJanitor, setSelectedJanitor] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  
  // Mock Supervisor ID for MVP (In real app, comes from Auth)
  const supervisorId = "supervisor-123" 

  useEffect(() => {
    login(supervisorId) // Mock Login
    fetchTeam(supervisorId)
  }, [])

  const handleConnect = async (e) => {
    e.preventDefault()
    setIsConnecting(true)
    const success = await connectJanitor(supervisorId, friendCode)
    setIsConnecting(false)
    if (success) setFriendCode('')
    else alert("Failed to connect. Check the code!")
  }

  const handleAddTask = async (e) => {
    e.preventDefault()
    if (!selectedJanitor) return alert("Please select a Janitor")
    
    await addTask(newTaskTitle, selectedJanitor)
    setNewTaskTitle('')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="mb-10 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div>
           <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
           <p className="text-gray-500">Manage your team and assignments</p>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="font-bold text-gray-900">{currentUser?.first_name} {currentUser?.last_name}</p>
              <p className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded inline-block">
                 My Code: {currentUser?.friend_code || "..."}
              </p>
            </div>
            <div className="bg-black text-white px-4 py-2 rounded-full font-bold">
              Supervisor
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: TEAM MANAGEMENT */}
        <section className="lg:col-span-1 space-y-6">
           
           {/* Add Member Card */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
               <UserPlus size={20} className="text-blue-600"/> Add Team Member
             </h3>
             <form onSubmit={handleConnect} className="flex gap-2">
               <input 
                 type="text" 
                 placeholder="Enter Friend Code (e.g. J-8921)"
                 value={friendCode}
                 onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                 className="flex-1 border p-2 rounded-lg uppercase tracking-widest text-center font-mono"
                 maxLength={6}
               />
               <button 
                 disabled={isConnecting || friendCode.length < 6}
                 className="bg-blue-600 text-white p-2 rounded-lg disabled:opacity-50"
               >
                 {isConnecting ? "..." : <Plus />}
               </button>
             </form>
             <p className="text-xs text-gray-400 mt-2">Ask your janitor for their code found on their dashboard.</p>
           </div>

           {/* Team List Card */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
               <Users size={20} className="text-blue-600"/> My Team
             </h3>
             
             {team.length === 0 ? (
               <div className="text-center py-8 text-gray-400">
                 No janitors connected yet.
               </div>
             ) : (
               <div className="space-y-3">
                 {team.map(member => (
                   <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {member.first_name?.[0] || "J"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{member.first_name} {member.last_name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   </div>
                 ))}
               </div>
             )}
           </div>
        </section>

        {/* RIGHT COLUMN: TASK MANAGEMENT */}
        <section className="lg:col-span-2 space-y-6">
           
           {/* Create Task Card */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h3 className="text-xl font-bold mb-4">Assign New Task</h3>
             <form onSubmit={handleAddTask} className="flex flex-col gap-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                 <input 
                   type="text" 
                   placeholder="e.g. Clean the 2nd floor hallway"
                   className="w-full border p-3 rounded-xl"
                   value={newTaskTitle}
                   onChange={(e) => setNewTaskTitle(e.target.value)}
                 />
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {team.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedJanitor(member.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full border transition-all ${
                          selectedJanitor === member.id 
                            ? "bg-blue-600 text-white border-blue-600" 
                            : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                        }`}
                      >
                        {member.first_name || member.email}
                      </button>
                    ))}
                    {team.length === 0 && (
                      <span className="text-gray-400 text-sm py-2">Add connection first!</span>
                    )}
                  </div>
               </div>

               <button 
                 disabled={!newTaskTitle || !selectedJanitor}
                 className="bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 transition-colors"
               >
                 Assign Task
               </button>
             </form>
           </div>
        </section>

      </div>
    </div>
  )
}

export default SupervisorDashboard

import { create } from 'zustand'
import axios from 'axios'
import { supabase } from '../lib/client'

// Configure Axios to point to our Backend
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000'
})

export const useStore = create((set, get) => ({
  // 1. STATE (The Data)
  tasks: [],
  userRole: null, 
  currentUser: null,
  isLoading: false,
  team: [],

  // 2. ACTIONS (The Functions)
  
  // --- AUTHENTICATION (Real Supabase) ---
  
  // Check active session on load
  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await get().fetchUserProfile(session.user.id)
      }
    } catch (e) {
      console.error("Session check failed", e)
    }
  },

  // Fetch Profile from Backend (or Supabase direct)
  fetchUserProfile: async (userId) => {
    try {
      // Query Supabase directly for speed
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (data) {
        set({ currentUser: data, userRole: data.role })
      }
    } catch (error) {
       console.error("Fetch profile failed", error)
    }
  },

  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      // Fetch profile to get role
      if (data.user) {
         await get().fetchUserProfile(data.user.id)
         return true
      }
    } catch (error) {
      console.error("Login failed:", error.message)
      alert("Login failed: " + error.message)
      return false
    }
  },

  signup: async (email, password, role, firstName, lastName) => {
    try {
      // 1. Create Auth User
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { first_name: firstName, last_name: lastName } 
        }
      })
      if (error) throw error
      if (!data.user) throw new Error("No user created")

      // 2. Create Profile Row (Our Backend Logic handles the Friend Code generation)
      // We call our Backend API to ensure it runs the profile creation logic
      const profileData = {
        id: data.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        role: role
      }
      
      await api.post('/profiles', profileData)

      // 3. Set State
      // We optimistically set the user so they are logged in immediately
      set({ currentUser: { ...profileData, friend_code: '...' }, userRole: role })
      
      // Fetch the real profile (with friend code) in background
      get().fetchUserProfile(data.user.id)
      
      return true
    } catch (error) {
      console.error("Signup failed:", error.message)
      alert("Signup failed: " + error.message)
      return false
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ currentUser: null, userRole: null, tasks: [], team: [] })
  },

  // --- ACTIONS ---

  // Switch between Supervisor and Janitor mode
  setRole: (role) => set({ userRole: role }),

  // Fetch tasks from Backend
  fetchTasks: async () => {
    set({ isLoading: true })
    try {
      const response = await api.get('/tasks')
      set({ tasks: response.data })
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      set({ isLoading: false })
    }
  },

  // Create a new task (Supervisor only)
  addTask: async (title, assignedToId) => {
    const { currentUser } = get()
    if (!currentUser) return 

    const newTask = { 
      title, 
      assigned_to: assignedToId,
      created_by: currentUser.id 
    }
    
    try {
      const response = await api.post('/tasks', newTask)
      set((state) => ({ tasks: [...state.tasks, ...response.data] }))
    } catch (error) {
      console.error("Failed to add task:", error)
    }
  },

  // Mark task as Done/Not Done (Janitor)
  toggleTask: async (taskId, currentStatus) => {
    try {
      // Optimistic Update
      set((state) => ({
        tasks: state.tasks.map(t => 
          t.id === taskId ? { ...t, is_completed: !currentStatus } : t
        )
      }))

      // Call Backend
      await api.patch(`/tasks/${taskId}`, { is_completed: !currentStatus })
    } catch (error) {
      console.error("Failed to toggle task:", error)
      get().fetchTasks()
    }
  },

  // --- TEAM MANAGEMENT ---

  // Connect Supervisor to Janitor
  connectJanitor: async (supervisorId, friendCode) => {
     try {
       const response = await api.post('/connect', { supervisor_id: supervisorId, friend_code: friendCode })
       // Refresh team list
       await get().fetchTeam(supervisorId)
       return true
     } catch (error) {
       console.error("Connection failed", error)
       return false
     }
  },

  // Fetch connected team
  fetchTeam: async (supervisorId) => {
    try {
      const response = await api.get(`/my-team/${supervisorId}`)
      set({ team: response.data })
    } catch (error) {
      console.error("Fetch team failed", error)
    }
  }

}))

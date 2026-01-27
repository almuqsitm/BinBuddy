import { create } from 'zustand'
import axios from 'axios'

// Configure Axios to point to our Backend
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000'
})

export const useStore = create((set, get) => ({
  // 1. STATE (The Data)
  tasks: [],
  userRole: 'janitor', // default for MVP
  isLoading: false,

  // 2. ACTIONS (The Functions)
  
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
    // For MVP, we hardcode the creator ID or remove it from strict validation
    const newTask = { 
      title, 
      assigned_to: assignedToId,
      created_by: assignedToId // temporary: self-assign creator
    }
    
    try {
      const response = await api.post('/tasks', newTask)
      // Update local state instantly so we don't need to refresh
      set((state) => ({ tasks: [...state.tasks, ...response.data] }))
    } catch (error) {
      console.error("Failed to add task:", error)
    }
  },

  // Mark task as Done/Not Done (Janitor)
  toggleTask: async (taskId, currentStatus) => {
    try {
      // Optimistic Update: Update UI *before* Backend finishes (feels faster)
      set((state) => ({
        tasks: state.tasks.map(t => 
          t.id === taskId ? { ...t, is_completed: !currentStatus } : t
        )
      }))

      // Call Backend
      await api.patch(`/tasks/${taskId}`, { is_completed: !currentStatus })
    } catch (error) {
      console.error("Failed to toggle task:", error)
      // Revert if it failed (optional, but good practice)
      get().fetchTasks()
    }
  }
}))

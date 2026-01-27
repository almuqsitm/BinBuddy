import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Safe initialization
const validConfig = supabaseUrl && supabaseAnonKey

if (!validConfig) {
  console.error('Supabase keys missing! Check frontend/.env')
}

// If keys are missing, we return a dummy object to prevent the whole app from crashing immediately
// This allows the UI to render (and likely fail gracefully later or show an error)
export const supabase = validConfig 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : { 
      auth: { 
        getSession: () => Promise.resolve({ data: { session: null } }),
        signInWithPassword: () => Promise.reject("Missing Config"),
        signUp: () => Promise.reject("Missing Config"),
        signOut: () => Promise.resolve()
      },
      from: () => ({ select: () => ({ eq: () => ({ single: () => ({ data: null }) }) }) }) 
    }

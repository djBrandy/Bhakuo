import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// We handle empty values to prevent a crash
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-url')) {
  console.warn('Supabase credentials missing. App will run in limited mode.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)


import { createClient } from '@supabase/supabase-js'

// Robust fallback to prevent 'URL is required' error that crashes the entire app.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Export a helper to check if we are truly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && 
         supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseKey.length > 0 &&
         supabaseKey !== 'placeholder-key';
};

// Create client with fallbacks to avoid crash on init, but logic should check isSupabaseConfigured()
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseKey || 'placeholder-key'
);

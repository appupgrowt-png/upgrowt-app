
import { createClient } from '@supabase/supabase-js'

// Robust fallback to prevent 'URL is required' error that crashes the entire app.
// This allows the UI to render even if Supabase isn't configured, 
// so the user sees the Onboarding instead of a blank screen.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

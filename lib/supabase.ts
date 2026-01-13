
import { createClient } from '@supabase/supabase-js'

// Helper to access env vars safely ensuring bundler replacement works
const getEnv = (key: string, viteKey: string) => {
  // 1. Try Vite import.meta.env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    if ((import.meta as any).env[key]) return (import.meta as any).env[key];
    if ((import.meta as any).env[viteKey]) return (import.meta as any).env[viteKey];
  }
  
  // 2. Try process.env (handled by vite.config.ts define)
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
       // @ts-ignore
       if (process.env[key]) return process.env[key];
       // @ts-ignore
       if (process.env[viteKey]) return process.env[viteKey];
    }
  } catch (e) {
    // Ignore process access errors
  }

  return '';
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = () => {
  return !!supabaseUrl && 
         !!supabaseKey &&
         supabaseUrl.startsWith('http') &&
         !supabaseUrl.includes('placeholder');
};

// Singleton instance that won't crash the app if config is missing
export const supabase = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseKey : 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

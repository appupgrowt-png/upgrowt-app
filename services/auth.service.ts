
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const signIn = async (email: string, pass: string) => {
  if (!isSupabaseConfigured()) throw new Error("Backend not configured");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, pass: string) => {
  if (!isSupabaseConfigured()) throw new Error("Backend not configured");
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
  } catch (e) {
    console.error("Unexpected error signing out:", e);
  }
};

export const getSession = async () => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  } catch (error) {
    console.error("Error getting session:", error);
    return null;
  }
};

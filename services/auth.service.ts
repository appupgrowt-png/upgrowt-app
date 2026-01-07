import { supabase } from '../lib/supabase';

export const signIn = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, pass: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error signing out:", error.message);
  } catch (e) {
    console.error("Unexpected error signing out:", e);
    // Proceed anyway as local storage will be cleared by MainApp
  }
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
};
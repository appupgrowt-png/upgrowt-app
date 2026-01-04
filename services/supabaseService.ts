
import { supabase } from '../lib/supabase';
import { UserProfile, ComprehensiveStrategy } from '../types';

// --- AUTH ---

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
  await supabase.auth.signOut();
};

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
};

// --- DATA PERSISTENCE ---

// 1. Save Profile Only (Used during Onboarding -> Auth transition)
export const saveBusinessProfile = async (userId: string, profile: UserProfile) => {
  const { data, error } = await supabase
    .from('business_profiles')
    .upsert({
      user_id: userId,
      business_name: profile.businessName,
      industry: profile.offering,
      stage: profile.businessAge,
      // Store full profile implicitly via strategy later, or explicitly here if needed.
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 2. Save Strategy (Used when AI generation finishes)
export const saveStrategySnapshot = async (businessId: string, profile: UserProfile, strategy: ComprehensiveStrategy) => {
  const { error } = await supabase
    .from('strategy_summary')
    .upsert({
      business_id: businessId,
      strategy_snapshot: { profile, strategy },
      locked: false
    }, { onConflict: 'business_id' });

  if (error) throw error;
};

// 3. Load Full Data (Used on Login)
export const loadUserData = async (userId: string) => {
  // 1. Get Business
  const { data: business, error: busError } = await supabase
    .from('business_profiles')
    .select('id, business_name')
    .eq('user_id', userId)
    .single();

  if (busError || !business) return null;

  // 2. Get Strategy
  const { data: strategyData } = await supabase
    .from('strategy_summary')
    .select('strategy_snapshot')
    .eq('business_id', business.id)
    .single();

  if (!strategyData) return { businessId: business.id, profile: null, strategy: null };

  return {
    businessId: business.id,
    profile: strategyData.strategy_snapshot.profile as UserProfile,
    strategy: strategyData.strategy_snapshot.strategy as ComprehensiveStrategy
  };
};

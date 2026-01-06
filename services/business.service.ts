import { supabase } from '../lib/supabase';
import { UserProfile, ComprehensiveStrategy, ExecutionState, WeeklyAgencyPlan } from '../types';

// 1. Save Profile Only (Used during Onboarding -> Auth transition)
export const saveBusinessProfile = async (userId: string, profile: UserProfile) => {
  const { data, error } = await supabase
    .from('business_profiles')
    .upsert({
      user_id: userId,
      business_name: profile.businessName,
      industry: profile.offering,
      stage: profile.businessAge,
      profile_data: profile // Persist full JSON to ensure recovery
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
  // A. Get Business
  const { data: business, error: busError } = await supabase
    .from('business_profiles')
    .select('id, business_name, profile_data')
    .eq('user_id', userId)
    .single();

  if (busError || !business) return null;

  // B. Get Strategy
  const { data: strategyData } = await supabase
    .from('strategy_summary')
    .select('strategy_snapshot')
    .eq('business_id', business.id)
    .single();

  // C. Get Progress (Execution & Weekly)
  const { data: progressData } = await supabase
    .from('user_progress')
    .select('execution_state, weekly_state')
    .eq('business_id', business.id)
    .single();

  // Resolve Profile: Prefer strategy snapshot (latest state), fallback to business profile_data
  // This ensures that if strategy generation failed or wasn't saved, we still have the profile form data.
  const resolvedProfile = (strategyData?.strategy_snapshot?.profile as UserProfile) || (business.profile_data as UserProfile) || null;

  return {
    businessId: business.id,
    profile: resolvedProfile,
    strategy: strategyData?.strategy_snapshot?.strategy as ComprehensiveStrategy || null,
    executionState: progressData?.execution_state || {},
    weeklyPlan: progressData?.weekly_state || null
  };
};

// 4. Update Progress (Granular Save)
export const saveUserProgress = async (userId: string, businessId: string, type: 'execution' | 'weekly', data: any) => {
  // We need to fetch current first to merge, or use upsert carefully. 
  // For simplicity/performance in this MVP, we blindly upsert the specific column passed.
  
  const updatePayload: any = {
    user_id: userId,
    business_id: businessId,
    updated_at: new Date().toISOString()
  };

  if (type === 'execution') updatePayload.execution_state = data;
  if (type === 'weekly') updatePayload.weekly_state = data;

  const { error } = await supabase
    .from('user_progress')
    .upsert(updatePayload, { onConflict: 'user_id' });

  if (error) console.error("Error saving progress:", error);
};

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, ComprehensiveStrategy, ExecutionState, WeeklyAgencyPlan } from '../types';

export type UserAppState = 'NEW_USER' | 'ONBOARDING_IN_PROGRESS' | 'STRATEGY_GENERATION_NEEDED' | 'READY';

export interface UserData {
  status: UserAppState;
  businessId: string | null;
  profile: UserProfile | null;
  strategy: ComprehensiveStrategy | null;
  executionState: ExecutionState;
  weeklyPlan: WeeklyAgencyPlan | null;
}

// Helper to parse JSON safely
const safeParse = (data: any, fallback: any = null) => {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.warn("JSON Parse Error:", e);
    return fallback;
  }
};

// --- MOCK STORAGE HELPERS ---
const MOCK_DELAY = 600;
const getMockData = (key: string) => {
  try {
    const data = localStorage.getItem(`upgrowth_mock_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (e) { return null; }
};
const setMockData = (key: string, data: any) => {
  try {
    localStorage.setItem(`upgrowth_mock_${key}`, JSON.stringify(data));
  } catch (e) { console.error("Local Storage Full", e); }
};

// 1. Load User Data
export const loadUserData = async (userId: string): Promise<UserData> => {
  // --- MOCK MODE ---
  if (!isSupabaseConfigured()) {
    console.warn("⚠️ Supabase not configured. Using Local Storage Mock.");
    await new Promise(r => setTimeout(r, MOCK_DELAY));
    
    // Check for existing mock business
    const business = getMockData(`biz_${userId}`);
    
    if (!business) {
        return { status: 'NEW_USER', businessId: null, profile: null, strategy: null, executionState: {}, weeklyPlan: null };
    }
    
    const profile = business.profile;
    const strategyWrap = getMockData(`strat_${business.id}`);
    const progress = getMockData(`prog_${business.id}`) || {};

    if (!profile || !profile.isConfigured) {
         return {
            status: 'ONBOARDING_IN_PROGRESS',
            businessId: business.id,
            profile: profile || { businessName: 'My Business' } as any,
            strategy: null,
            executionState: {},
            weeklyPlan: null
         };
    }

    if (!strategyWrap) {
        return {
            status: 'STRATEGY_GENERATION_NEEDED',
            businessId: business.id,
            profile,
            strategy: null,
            executionState: progress.execution_state || {},
            weeklyPlan: progress.weekly_state || null
        };
    }

    return {
        status: 'READY',
        businessId: business.id,
        profile,
        strategy: strategyWrap.strategy, 
        executionState: progress.execution_state || {},
        weeklyPlan: progress.weekly_state || null
    };
  }

  // --- REAL SUPABASE MODE ---
  try {
    const { data: business, error: busError } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (busError && busError.code !== 'PGRST116') throw busError;

    if (!business) {
      return { status: 'NEW_USER', businessId: null, profile: null, strategy: null, executionState: {}, weeklyPlan: null };
    }

    const profile = safeParse(business.profile_data) as UserProfile;

    if (!profile || !profile.businessName || !profile.isConfigured) {
      return {
        status: 'ONBOARDING_IN_PROGRESS',
        businessId: business.id,
        profile: profile || { businessName: business.business_name } as any, 
        strategy: null,
        executionState: {},
        weeklyPlan: null
      };
    }

    const [strategyResult, progressResult] = await Promise.all([
      supabase.from('strategy_summary').select('strategy_snapshot').eq('business_id', business.id).maybeSingle(),
      supabase.from('user_progress').select('execution_state, weekly_state').eq('business_id', business.id).maybeSingle()
    ]);

    const strategySnapshot = safeParse(strategyResult.data?.strategy_snapshot);
    const strategy = strategySnapshot?.strategy as ComprehensiveStrategy || null;
    const executionState = safeParse(progressResult.data?.execution_state, {}) as ExecutionState;
    const weeklyPlan = safeParse(progressResult.data?.weekly_state, null) as WeeklyAgencyPlan;

    if (!strategy) {
      return {
        status: 'STRATEGY_GENERATION_NEEDED',
        businessId: business.id,
        profile,
        strategy: null,
        executionState,
        weeklyPlan
      };
    }

    return {
      status: 'READY',
      businessId: business.id,
      profile,
      strategy,
      executionState,
      weeklyPlan
    };

  } catch (error) {
    console.error("Critical Load Error:", error);
    throw error;
  }
};

// 2. Save Business Profile
export const saveBusinessProfile = async (userId: string, profile: UserProfile) => {
  if (!profile.businessName) throw new Error("Invalid Profile Data");

  // --- MOCK MODE ---
  if (!isSupabaseConfigured()) {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      const id = 'mock_biz_' + userId;
      const data = { id, user_id: userId, profile };
      setMockData(`biz_${userId}`, data);
      return data;
  }

  const payload = {
    user_id: userId,
    business_name: profile.businessName,
    industry: profile.offering || 'General',
    stage: profile.businessAge || 'Startup',
    profile_data: profile,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 3. Save Strategy Snapshot
export const saveStrategySnapshot = async (businessId: string, profile: UserProfile, strategy: ComprehensiveStrategy) => {
  // --- MOCK MODE ---
  if (!isSupabaseConfigured()) {
      await new Promise(r => setTimeout(r, MOCK_DELAY));
      setMockData(`strat_${businessId}`, { profile, strategy });
      return;
  }

  const { error } = await supabase
    .from('strategy_summary')
    .upsert({
      business_id: businessId,
      strategy_snapshot: { profile, strategy },
      locked: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'business_id' });

  if (error) throw error;
};

// 4. Save Progress
export const saveUserProgress = async (userId: string, businessId: string, type: 'execution' | 'weekly', data: any) => {
   // --- MOCK MODE ---
   if (!isSupabaseConfigured()) {
      const current = getMockData(`prog_${businessId}`) || {};
      if (type === 'execution') current.execution_state = data;
      if (type === 'weekly') current.weekly_state = data;
      setMockData(`prog_${businessId}`, current);
      return;
   }

  const { data: existing } = await supabase.from('user_progress').select('*').eq('business_id', businessId).maybeSingle();
  
  const payload: any = {
    user_id: userId,
    business_id: businessId,
    updated_at: new Date().toISOString(),
    execution_state: existing?.execution_state || {},
    weekly_state: existing?.weekly_state || null
  };

  if (type === 'execution') payload.execution_state = data;
  if (type === 'weekly') payload.weekly_state = data;

  const { error } = await supabase
    .from('user_progress')
    .upsert(payload, { onConflict: 'business_id' });

  if (error) console.error("Error saving progress:", error);
};

// 5. Account Reset
export const resetUserAccount = async (userId: string) => {
  // --- MOCK MODE ---
  if (!isSupabaseConfigured()) {
      const biz = getMockData(`biz_${userId}`);
      if (biz) {
          localStorage.removeItem(`strat_${biz.id}`);
          localStorage.removeItem(`prog_${biz.id}`);
      }
      localStorage.removeItem(`biz_${userId}`);
      return;
  }

  const { data: b } = await supabase.from('business_profiles').select('id').eq('user_id', userId).single();
  if (b) {
    await supabase.from('strategy_summary').delete().eq('business_id', b.id);
    await supabase.from('user_progress').delete().eq('business_id', b.id);
    await supabase.from('business_profiles').delete().eq('id', b.id);
  }
};

// 6. Update Onboarding Progress (Partial)
export const updateOnboardingProgress = async (userId: string, data: Partial<UserProfile>) => {
    // --- MOCK MODE ---
    if (!isSupabaseConfigured()) {
        const existing = getMockData(`biz_${userId}`) || { id: 'mock_biz_' + userId, user_id: userId, profile: {} };
        existing.profile = { ...existing.profile, ...data };
        setMockData(`biz_${userId}`, existing);
        return;
    }

    const payload: any = {
        user_id: userId,
        profile_data: data,
        updated_at: new Date().toISOString()
    };
    
    // Check if properties exist before assignment to avoid TS issues if loose typing
    if (data.businessName) payload.business_name = data.businessName;
    if (data.offering) payload.industry = data.offering;
    if (data.businessAge) payload.stage = data.businessAge;

    const { error } = await supabase
        .from('business_profiles')
        .upsert(payload, { onConflict: 'user_id' });

    if (error) {
        console.warn("Failed to auto-save onboarding:", error.message);
    }
};

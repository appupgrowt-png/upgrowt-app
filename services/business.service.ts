
import { supabase } from '../lib/supabase';
import { UserProfile, ComprehensiveStrategy, ExecutionState, WeeklyAgencyPlan } from '../types';

// Definición explícita del tipo de retorno
export interface UserData {
  businessId: string | null;
  profile: UserProfile | null;
  strategy: ComprehensiveStrategy | null;
  executionState: ExecutionState;
  weeklyPlan: WeeklyAgencyPlan | null;
}

// 1. Save Profile Only (Full Save)
export const saveBusinessProfile = async (userId: string, profile: UserProfile) => {
  const { data, error } = await supabase
    .from('business_profiles')
    .upsert({
      user_id: userId,
      business_name: profile.businessName,
      industry: profile.offering || 'General',
      stage: profile.businessAge || 'Startup',
      profile_data: profile,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// 1.5 Save Partial Onboarding Progress (Step-by-Step)
export const updateOnboardingProgress = async (userId: string, partialProfile: Partial<UserProfile>) => {
  // Fix: Ensure we provide values for required columns even if partialProfile doesn't have them yet.
  // This prevents DB constraint violations if 'industry' or 'stage' are NOT NULL in the schema.
  
  const payload = {
    user_id: userId,
    profile_data: partialProfile, 
    business_name: partialProfile.businessName || 'Borrador de Negocio',
    // Fallbacks for potential non-nullable columns
    industry: partialProfile.offering || partialProfile.description || 'Pendiente', 
    stage: partialProfile.businessAge || 'Pendiente',
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error("Error saving partial progress:", error);
    // Silent fail is acceptable for autosave, but logging it helps debugging
  } else {
    console.log("✅ Partial progress saved for:", userId);
  }
};

// 2. Save Strategy (Fixed & Exported)
export const saveStrategySnapshot = async (businessId: string, profile: UserProfile, strategy: ComprehensiveStrategy) => {
  console.log("💾 Saving Strategy Snapshot...", businessId);
  const { error } = await supabase
    .from('strategy_summary')
    .upsert({
      business_id: businessId,
      strategy_snapshot: { profile, strategy },
      locked: false,
      updated_at: new Date().toISOString()
    }, { onConflict: 'business_id' });

  if (error) {
    console.error("❌ Error saving strategy:", error);
    throw error;
  }
  console.log("✅ Strategy Saved Successfully");
};

// 3. Load Full Data (Optimized with Promise.all for Speed)
export const loadUserData = async (userId: string): Promise<UserData | null> => {
  try {
    // A. Obtener Business Profile primero (Necesitamos el ID)
    const { data: business, error: busError } = await supabase
      .from('business_profiles')
      .select('id, business_name, profile_data')
      .eq('user_id', userId)
      .maybeSingle(); 

    if (busError) {
       console.warn("DB Read Error (Business):", busError.message);
       if (busError.code === '401' || busError.code === 'PGRST301') throw new Error('AUTH_INVALID');
       return null; 
    }

    if (!business) {
       console.log("No business profile found for user.");
       return { 
         businessId: null, 
         profile: null, 
         strategy: null, 
         executionState: {}, 
         weeklyPlan: null 
       };
    }

    // Fix: Safely parse profile_data if it comes back as a string (rare but possible in some Supabase configs)
    let profileFromDB = business.profile_data;
    if (typeof profileFromDB === 'string') {
        try {
            profileFromDB = JSON.parse(profileFromDB);
        } catch (e) {
            console.error("Failed to parse profile_data JSON", e);
        }
    }

    // B. Obtener Strategy y Progreso en PARALELO para mayor velocidad
    const [strategyResult, progressResult] = await Promise.all([
      supabase
        .from('strategy_summary')
        .select('strategy_snapshot')
        .eq('business_id', business.id)
        .maybeSingle(),
      
      supabase
        .from('user_progress')
        .select('execution_state, weekly_state')
        .eq('business_id', business.id)
        .maybeSingle()
    ]);

    const resolvedStrategy = (strategyResult.data?.strategy_snapshot?.strategy as ComprehensiveStrategy) || null;
    
    // Resolve Profile: Prefer strategy snapshot (historical), fallback to current business profile
    const resolvedProfile = (strategyResult.data?.strategy_snapshot?.profile as UserProfile) || (profileFromDB as UserProfile) || null;

    console.log("✅ Data Loaded. Profile found:", !!resolvedProfile);

    return {
      businessId: business.id,
      profile: resolvedProfile,
      strategy: resolvedStrategy,
      executionState: (progressResult.data?.execution_state as ExecutionState) || {},
      weeklyPlan: (progressResult.data?.weekly_state as WeeklyAgencyPlan) || null
    };

  } catch (error: any) {
    if (error.message === 'AUTH_INVALID') throw error;
    console.error("Critical Load Error:", error);
    return null;
  }
};

// 4. Update Progress
export const saveUserProgress = async (userId: string, businessId: string, type: 'execution' | 'weekly', data: any) => {
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

  if (error) console.error("Error guardando progreso:", error);
};

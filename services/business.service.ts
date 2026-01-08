
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
      profile_data: profile // Guardamos todo el JSON para recuperar el estado
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
  try {
    // A. Obtener Business Profile
    // Usamos maybeSingle() para que NO lance error si no existe, sino que devuelva null.
    const { data: business, error: busError } = await supabase
      .from('business_profiles')
      .select('id, business_name, profile_data')
      .eq('user_id', userId)
      .maybeSingle(); 

    if (busError) {
       console.error("Error DB al cargar perfil:", busError);
       return null; // Error real de DB
    }

    if (!business) {
       // Usuario existe en Auth, pero no tiene Business Profile.
       // Esto indica que es un USUARIO NUEVO que debe ir a Onboarding.
       return { 
         businessId: null, 
         profile: null, 
         strategy: null, 
         executionState: {}, 
         weeklyPlan: null 
       };
    }

    // B. Obtener Strategy (si existe)
    const { data: strategyData } = await supabase
      .from('strategy_summary')
      .select('strategy_snapshot')
      .eq('business_id', business.id)
      .maybeSingle();

    // C. Obtener Progreso (Execution & Weekly)
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('execution_state, weekly_state')
      .eq('business_id', business.id)
      .maybeSingle();

    // Resolver el perfil más actualizado:
    // Preferimos el del snapshot de estrategia si existe, si no, el del business profile.
    const resolvedProfile = (strategyData?.strategy_snapshot?.profile as UserProfile) || (business.profile_data as UserProfile) || null;

    return {
      businessId: business.id,
      profile: resolvedProfile,
      strategy: strategyData?.strategy_snapshot?.strategy as ComprehensiveStrategy || null,
      executionState: progressData?.execution_state || {},
      weeklyPlan: progressData?.weekly_state || null
    };
  } catch (error) {
    console.error("Excepción inesperada en loadUserData:", error);
    return null;
  }
};

// 4. Update Progress (Granular Save)
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

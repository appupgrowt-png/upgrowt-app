
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
      profile_data: profile
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

// 3. Load Full Data (Critical Function)
export const loadUserData = async (userId: string) => {
  try {
    // Check connection first
    const { error: healthCheck } = await supabase.from('business_profiles').select('count', { count: 'exact', head: true });
    if (healthCheck && healthCheck.code !== 'PGRST116') { // Ignore "no rows" error, worry about connection errors
       console.warn("Health Check Warning:", healthCheck);
       // If unauthorized, throw immediately to trigger auto-logout in MainApp
       if (healthCheck.code === '401' || healthCheck.message?.includes('JWT')) {
         throw new Error('AUTH_INVALID');
       }
    }

    // A. Obtener Business Profile
    const { data: business, error: busError } = await supabase
      .from('business_profiles')
      .select('id, business_name, profile_data')
      .eq('user_id', userId)
      .maybeSingle(); 

    if (busError) {
       console.error("Error cargando perfil de negocio:", busError.message);
       // Si hay error de RLS o permiso, asumimos usuario nuevo o inválido
       return null; 
    }

    if (!business) {
       // El usuario tiene Auth válido pero NO tiene perfil en DB.
       // Retornamos objeto vacio para activar flujo de Onboarding.
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

    // Resolver el perfil más actualizado
    const resolvedProfile = (strategyData?.strategy_snapshot?.profile as UserProfile) || (business.profile_data as UserProfile) || null;

    return {
      businessId: business.id,
      profile: resolvedProfile,
      strategy: strategyData?.strategy_snapshot?.strategy as ComprehensiveStrategy || null,
      executionState: progressData?.execution_state || {},
      weeklyPlan: progressData?.weekly_state || null
    };
  } catch (error: any) {
    console.error("Excepción en loadUserData:", error);
    if (error.message === 'AUTH_INVALID') throw error; // Re-throw auth errors to force logout
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

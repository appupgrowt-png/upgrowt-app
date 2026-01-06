import React, { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { ConsultancyReport } from './components/ConsultancyReport';
import { RoadmapView } from './components/RoadmapView';
import { DashboardHome } from './components/DashboardHome';
import { WeeklyAgencyDashboard } from './components/WeeklyAgencyDashboard';
import { WowMoment } from './components/WowMoment';
import { CompletionSuccess } from './components/CompletionSuccess';
import { Pricing } from './components/Pricing';
import { Loading } from './components/ui/Loading';
import { Button } from './components/ui/Button';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { AuthView } from './components/AuthView';
import { TransitionScreen } from './components/TransitionScreen';
import { generateAuditStream, generateActionPlan, generateWeeklyAgencyPlan } from './services/geminiService';
import { saveBusinessProfile, saveStrategySnapshot, loadUserData, saveUserProgress } from './services/business.service';
import { getSession, signOut } from './services/auth.service';
import { UserProfile, ComprehensiveStrategy, Language, BusinessAudit, ExecutionState, WeeklyAgencyPlan } from './types';
import { t } from './utils/i18n';
import { supabase } from './lib/supabase';

type ViewState = 'loading' | 'auth' | 'transition' | 'onboarding' | 'report' | 'roadmap' | 'wow' | 'dashboard' | 'completion' | 'pricing' | 'weekly_agency' | 'error';

export default function MainApp() {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // App Data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [audit, setAudit] = useState<BusinessAudit | null>(null);
  const [strategy, setStrategy] = useState<ComprehensiveStrategy | null>(null);
  const [executionState, setExecutionState] = useState<ExecutionState>({});
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyAgencyPlan | null>(null);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [streamingLog, setStreamingLog] = useState<string>('');
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [view, setView] = useState<ViewState>('loading');
  const [sidebarAction, setSidebarAction] = useState<string>('');
  const [language, setLanguage] = useState<Language>('es');
  const [appError, setAppError] = useState<string | null>(null);

  // Recovery State
  const [shouldRecoverStrategy, setShouldRecoverStrategy] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    let mounted = true;

    const loadDataForUser = async (userId: string) => {
      try {
        setLoadingMessage('Sincronizando estrategia...');
        const data = await loadUserData(userId);
        
        if (!mounted) return;

        if (data && data.profile) {
          // Existing user with profile -> Go to App
          setBusinessId(data.businessId);
          setProfile(data.profile);
          if (data.profile.language) setLanguage(data.profile.language);
          
          if (data.executionState) setExecutionState(data.executionState);
          if (data.weeklyPlan) setWeeklyPlan(data.weeklyPlan as WeeklyAgencyPlan);

          // CRITICAL: Force dashboard if strategy exists to prevent onboarding redirect
          if (data.strategy) {
            setStrategy(data.strategy);
            setAudit(data.strategy.audit);
            
            if (data.weeklyPlan) {
              setView('weekly_agency');
            } else {
              setView('dashboard');
            }
          } else {
             // Profile exists, but Strategy missing. 
             console.log("Profile found, recovering strategy...");
             setShouldRecoverStrategy(true);
          }
        } else {
          // User exists but NO profile -> They just logged in for the first time
          setView('transition');
        }
      } catch (e: any) {
        console.error("Load Error", e);
        if (mounted) {
           if (e.message?.includes('column') || e.code === '42703') {
             setAppError("Error de Base de Datos: Faltan columnas necesarias. Por favor ejecuta el script SQL de migración en Supabase.");
             setView('error');
           } else {
             setView('auth');
           }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    const initAuth = async () => {
      setIsLoading(true);
      setLoadingMessage('Conectando con UpGrowth...');
      
      // 1. Get initial session
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (initialSession?.user) {
        setSession(initialSession);
        await loadDataForUser(initialSession.user.id);
      } else {
        setIsLoading(false);
        setView('auth');
      }

      // 2. Listen for Auth Changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          if (newSession.user.id !== session?.user?.id) {
            setSession(newSession);
            await loadDataForUser(newSession.user.id);
          }
        } 
        // Note: SIGNED_OUT handling moved to explicit logout button to avoid race conditions
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    initAuth();
  }, []); 

  // --- SAVE STRATEGY SIDE EFFECT ---
  useEffect(() => {
    // Ensuring data persists whenever we have a valid strategy loaded/generated
    if (session && businessId && profile && strategy && !isLoading) {
       saveStrategySnapshot(businessId, profile, strategy).catch(console.error);
    }
  }, [strategy, session, businessId, profile, isLoading]);

  // --- AUTO RECOVERY EFFECT ---
  useEffect(() => {
    if (shouldRecoverStrategy && profile && session) {
      setShouldRecoverStrategy(false);
      handleProfileSave(profile);
    }
  }, [shouldRecoverStrategy, profile, session]);


  // --- HANDLERS ---

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    if (profile) {
      setProfile({ ...profile, language: lang });
    }
  };

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    handleProfileSave(newProfile);
  };

  const handleProfileSave = async (profileData: UserProfile) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setLoadingMessage('Generando estrategia directiva...');
    
    try {
      // 1. Save profile to DB
      const business = await saveBusinessProfile(session.user.id, profileData);
      setBusinessId(business.id);

      // 2. Generate Audit
      setLoadingMessage('El Director IA está analizando tu negocio...');
      const generatedAudit = await generateAuditStream(profileData, language, (text) => {
        setStreamingLog(text);
      });
      
      setAudit(generatedAudit);
      setStreamingLog(''); 
      
      // 3. Start generating Strategy
      setIsPlanGenerating(true);
      generateActionPlan(profileData, generatedAudit, language)
        .then(plan => {
          setStrategy({ ...plan, audit: generatedAudit });
          setIsPlanGenerating(false);
          // Auto-save happens via useEffect, but let's double check to be safe for reload
          saveStrategySnapshot(business.id, profileData, { ...plan, audit: generatedAudit });
        })
        .catch(err => {
          console.error("Background Strategy Gen Error", err);
          setIsPlanGenerating(false);
        });

      setView('report'); 
      
    } catch (e: any) {
      console.error(e);
      setView('onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (userId: string) => {
    const currentSession = await getSession();
    setSession(currentSession);
    setView('transition');
  };
  
  const handleTransitionComplete = () => {
    setView('onboarding');
  };

  const handleReportContinue = () => {
    if (isPlanGenerating) {
       setIsLoading(true); 
       const checkInterval = setInterval(() => {
          setStrategy(prev => {
            if (prev) {
              clearInterval(checkInterval);
              setIsLoading(false);
              setView('roadmap');
              return prev;
            }
            return null;
          });
       }, 500);
    } else {
       if (strategy) {
         setView('roadmap');
       } else {
         alert("La estrategia aún no se ha generado por completo. Espera unos segundos.");
       }
    }
  };

  const handleStartPriority = () => setView('wow');
  const handleWowContinue = () => setView('dashboard');
  const handleCompletePriority = () => setView('completion');
  
  const handleEnterWeeklyMode = async () => {
    if (!profile) return;
    if (weeklyPlan) { setView('weekly_agency'); return; }

    setIsLoading(true);
    setLoadingMessage(t('generating_week', language));
    try {
      const plan = await generateWeeklyAgencyPlan(profile, language);
      setWeeklyPlan(plan);
      if (session?.user?.id && businessId) {
        await saveUserProgress(session.user.id, businessId, 'weekly', plan);
      }
      setIsLoading(false);
      setView('weekly_agency');
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      setView('dashboard'); 
    }
  };

  const handleLogout = async () => {
    if(confirm("¿Estás seguro de cerrar sesión?")) {
      await signOut();
      // FORCE RELOAD to clear all state and prevent artifacts
      window.location.href = '/'; 
    }
  };

  const handleUpdateExecution = (stepIndex: number, data: Record<string, string>) => {
    const newState = { ...executionState, [stepIndex]: data };
    setExecutionState(newState);
    if (session?.user?.id && businessId) {
      saveUserProgress(session.user.id, businessId, 'execution', newState);
    }
  };

  const handleUpdateWeeklyTask = (taskIndex: number, isCompleted: boolean) => {
    if (!weeklyPlan) return;
    const newTasks = [...weeklyPlan.dailyPlan];
    newTasks[taskIndex].isCompleted = isCompleted;
    const newPlan = { ...weeklyPlan, dailyPlan: newTasks };
    setWeeklyPlan(newPlan);
    if (session?.user?.id && businessId) {
      saveUserProgress(session.user.id, businessId, 'weekly', newPlan);
    }
  };

  const handleSidebarClick = (action: string) => {
    if (action === 'roadmap') { setView('roadmap'); return; }
    if (action === 'hero') {
      if (weeklyPlan) setView('weekly_agency');
      else setView('dashboard');
    }
    setSidebarAction(action);
    setTimeout(() => setSidebarAction(''), 100);
  };

  const getCurrentPhaseIndex = () => {
    if (!strategy) return 0;
    const activeIndex = strategy.roadmap.findIndex(r => r.status === 'active');
    return activeIndex === -1 ? 0 : activeIndex;
  };

  // --- RENDER ---

  if (view === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="glass-panel p-10 border-red-500/20 max-w-lg">
           <div className="text-5xl mb-4">🛠️</div>
           <h2 className="text-2xl font-bold text-white mb-2">Configuración de Base de Datos Requerida</h2>
           <p className="text-slate-400 mb-6">{appError}</p>
           <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
         <Loading 
            message={loadingMessage || (language === 'en' ? "Connecting..." : "Conectando...")} 
            subMessage={isPlanGenerating ? "Generando estrategia maestra..." : undefined}
            streamLog={streamingLog}
         />
      </div>
    );
  }

  if (view === 'auth') {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  if (view === 'transition') {
    return <TransitionScreen onComplete={handleTransitionComplete} />;
  }

  if (view === 'onboarding') {
    return (
      <>
        <LanguageSwitcher currentLang={language} onToggle={handleLanguageChange} />
        <div className="absolute top-6 left-6 z-50">
           <button onClick={handleLogout} className="text-slate-500 text-xs hover:text-white">Salir</button>
        </div>
        <Onboarding onComplete={handleOnboardingComplete} />
      </>
    );
  }

  if (view === 'report' && profile && audit) {
    return (
      <ConsultancyReport 
        profile={profile} 
        auditData={audit} 
        onContinue={handleReportContinue} 
        isLoadingPlan={isPlanGenerating} 
      />
    );
  }

  // --- CENTRAL ALIGNMENT FIX FOR MAIN APP VIEWS ---
  // The outer main container now uses flex-col items-center to center the content hierarchically
  
  if (view === 'roadmap' && strategy && profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar onLogout={handleLogout} onSettings={() => setView('pricing')} activeView={view} onNavigate={handleSidebarClick} lang={language} currentPhaseIndex={getCurrentPhaseIndex()} />
        <main className="flex-1 md:ml-64 relative min-h-screen flex flex-col items-center bg-slate-950">
           <RoadmapView phases={strategy.roadmap} profile={profile} lang={language} onStartPriority={handleStartPriority} />
        </main>
      </div>
    );
  }

  if (view === 'wow' && strategy) return <WowMoment focus={strategy.priorityFocus} onContinue={handleWowContinue} />;
  
  if (view === 'completion') return <CompletionSuccess onNext={handleEnterWeeklyMode} lang={language} />;
  
  if (view === 'pricing') return <Pricing onBack={() => setView(weeklyPlan ? 'weekly_agency' : 'dashboard')} />;

  if (view === 'weekly_agency' && profile && weeklyPlan && strategy) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar onLogout={handleLogout} onSettings={() => setView('pricing')} activeView={view} onNavigate={handleSidebarClick} lang={language} currentPhaseIndex={getCurrentPhaseIndex()} />
        <main className="flex-1 md:ml-64 p-4 md:p-8 relative min-h-screen flex flex-col items-center bg-slate-950">
           <div className="w-full max-w-[95vw] 2xl:max-w-[1800px] mb-6 mt-12 md:mt-0 md:hidden flex justify-between">
              <span className="text-white font-bold">upGrowt</span>
              <button onClick={handleLogout} className="text-slate-400 text-sm">Salir</button>
           </div>
           <WeeklyAgencyDashboard plan={weeklyPlan} profile={profile} lang={language} onUpdateTask={handleUpdateWeeklyTask} strategy={strategy} />
        </main>
      </div>
    );
  }

  if (view === 'dashboard' && profile && strategy) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar onLogout={handleLogout} onSettings={() => setView('pricing')} activeView={view} onNavigate={handleSidebarClick} lang={language} currentPhaseIndex={getCurrentPhaseIndex()} />
        <main className="flex-1 md:ml-64 p-4 md:p-8 relative min-h-screen flex flex-col items-center bg-slate-950">
           <div className="w-full max-w-[95vw] 2xl:max-w-[1800px] mb-6 mt-12 md:mt-0 md:hidden flex justify-between">
              <span className="text-white font-bold">upGrowt</span>
              <button onClick={handleLogout} className="text-slate-400 text-sm">Salir</button>
           </div>
           <DashboardHome strategy={strategy} profile={profile} businessName={profile.businessName} onCompletePriority={handleCompletePriority} activeSidebarAction={sidebarAction} lang={language} onUpdateExecution={handleUpdateExecution} savedExecutionState={executionState} />
        </main>
      </div>
    );
  }

  return <Loading />;
}
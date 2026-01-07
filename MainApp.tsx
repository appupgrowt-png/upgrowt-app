
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
import { saveBusinessProfile, loadUserData, saveUserProgress } from './services/business.service';
import { signOut } from './services/auth.service';
import { UserProfile, ComprehensiveStrategy, Language, BusinessAudit, ExecutionState, WeeklyAgencyPlan } from './types';
import { t } from './utils/i18n';
import { supabase, isSupabaseConfigured } from './lib/supabase';

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
  const [loadingMessage, setLoadingMessage] = useState<string>('Iniciando sistema...');
  const [streamingLog, setStreamingLog] = useState<string>('');
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [isWaitingForStrategy, setIsWaitingForStrategy] = useState(false);
  const [view, setView] = useState<ViewState>('loading');
  const [sidebarAction, setSidebarAction] = useState<string>('');
  const [language, setLanguage] = useState<Language>('es');
  const [appError, setAppError] = useState<string | null>(null);

  // Recovery State
  const [shouldRecoverStrategy, setShouldRecoverStrategy] = useState(false);

  // --- AUTO NAVIGATE WHEN STRATEGY IS READY ---
  useEffect(() => {
    if (isWaitingForStrategy && strategy) {
      setIsWaitingForStrategy(false);
      setView('roadmap');
    }
  }, [strategy, isWaitingForStrategy]);

  // --- CORE AUTHENTICATION & ROUTING LOGIC ---
  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      try {
        console.log("🚀 Initializing App...");
        
        // 0. Configuration Check
        if (!isSupabaseConfigured()) {
           console.warn("⚠️ Supabase credentials missing or using placeholder. Skipping network requests.");
           if (mounted) {
             setView('auth');
             setIsLoading(false);
           }
           return;
        }

        // RACE CONDITION PROTECTION: Force timeout if Supabase hangs
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));

        // 1. Check Session with Timeout
        let sessionResult: any;
        try {
           sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
        } catch (e) {
           console.warn("Session check timed out or failed, defaulting to Auth.");
           if (mounted) {
             setView('auth');
             setIsLoading(false);
           }
           return;
        }

        const { data: { session: currentSession }, error } = sessionResult;
        
        if (error || !currentSession) {
           console.log("👤 No session found, showing Login.");
           if (mounted) {
             setView('auth');
             setIsLoading(false);
           }
           return;
        }

        // 2. Session found
        if (mounted) {
          setSession(currentSession);
          setLoadingMessage('Sincronizando perfil...');
          console.log("✅ Session found for:", currentSession.user.email);
        }

        // 3. Load Data
        const data = await loadUserData(currentSession.user.id);
        
        if (!mounted) return;

        if (data && data.profile) {
           // Existing User with Profile
           console.log("📂 User profile loaded.");
           setBusinessId(data.businessId);
           setProfile(data.profile);
           if (data.profile.language) setLanguage(data.profile.language);
           if (data.executionState) setExecutionState(data.executionState);
           if (data.weeklyPlan) setWeeklyPlan(data.weeklyPlan as WeeklyAgencyPlan);

           if (data.strategy) {
              // Happy Path: Full Data
              setStrategy(data.strategy);
              setAudit(data.strategy.audit);
              setView(data.weeklyPlan ? 'weekly_agency' : 'dashboard');
           } else {
              // Edge Case: Profile exists but Strategy is missing/corrupted
              console.warn("⚠️ Profile found but strategy missing. Attempting recovery...");
              setShouldRecoverStrategy(true);
              return; 
           }
        } else {
           // New User (Session YES, Profile NO)
           console.log("✨ New user detected. Starting onboarding.");
           setView('transition'); // Leads to onboarding
        }

      } catch (e: any) {
         console.error("❌ Critical Init Error:", e);
         if (mounted) {
           // If something explodes, safe fallback to Auth to allow retry
           setView('auth');
         }
      } finally {
         // Only turn off loading if we haven't triggered recovery (which needs to keep loading UI)
         if (mounted && !shouldRecoverStrategy) {
            setIsLoading(false);
         }
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
       if (event === 'SIGNED_OUT') {
         setSession(null);
         setView('auth');
         setIsLoading(false);
       } else if (event === 'SIGNED_IN') {
         if (!session) {
             // Optional: handle reload logic here if needed
         }
       }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); 

  // --- AUTO RECOVERY ---
  useEffect(() => {
    if (shouldRecoverStrategy && profile && session) {
      setShouldRecoverStrategy(false);
      handleProfileSave(profile);
    }
  }, [shouldRecoverStrategy, profile, session]);


  // --- HANDLERS ---

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    if (profile) setProfile({ ...profile, language: lang });
  };

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    handleProfileSave(newProfile);
  };

  const triggerStrategyGeneration = async (profileData: UserProfile, auditData: BusinessAudit, bizId: string) => {
    setIsPlanGenerating(true);
    try {
      const plan = await generateActionPlan(profileData, auditData, language);
      const fullStrategy = { ...plan, audit: auditData };
      setStrategy(fullStrategy);
    } catch (err) {
      console.error("Strategy Gen Error", err);
    } finally {
      setIsPlanGenerating(false);
    }
  };

  const handleProfileSave = async (profileData: UserProfile) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setLoadingMessage('Generando estrategia directiva...');
    
    try {
      const business = await saveBusinessProfile(session.user.id, profileData);
      setBusinessId(business.id);

      setLoadingMessage('El Director IA está analizando tu negocio...');
      const generatedAudit = await generateAuditStream(profileData, language, (text) => {
        setStreamingLog(text);
      });
      
      setAudit(generatedAudit);
      setStreamingLog(''); 
      
      triggerStrategyGeneration(profileData, generatedAudit, business.id);

      setView('report'); 
      
    } catch (e: any) {
      console.error(e);
      if (!businessId) setView('onboarding');
      else setView('dashboard'); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async () => {
    window.location.reload();
  };
  
  const handleTransitionComplete = () => {
    setView('onboarding');
  };

  const handleReportContinue = () => {
    if (strategy) {
      setView('roadmap');
      return;
    }
    setIsWaitingForStrategy(true);
    if (!isPlanGenerating && profile && audit && businessId) {
      triggerStrategyGeneration(profile, audit, businessId);
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
      setView('weekly_agency');
    } catch (e) {
      console.error(e);
      setView('dashboard'); 
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
        setIsLoading(true);
        setLoadingMessage('Cerrando sesión...');
        await signOut();
        setSession(null);
        setProfile(null);
        setStrategy(null);
        localStorage.clear(); 
        setView('auth');
    } catch (error) {
        console.error("Logout failed", error);
        setView('auth');
    } finally {
        setIsLoading(false);
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
           <h2 className="text-2xl font-bold text-white mb-2">Error de Sistema</h2>
           <p className="text-slate-400 mb-6">{appError || "Ha ocurrido un error inesperado."}</p>
           <Button onClick={() => window.location.reload()}>Recargar Aplicación</Button>
        </div>
      </div>
    );
  }

  // Priority to Loading Screen if explicit loading requested
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

  // Priority to Auth View
  if (view === 'auth') {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  // Only renders if NOT loading and NOT auth
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
        isLoadingPlan={isPlanGenerating || isWaitingForStrategy} 
      />
    );
  }

  // --- MAIN LAYOUT STRUCTURE ---
  const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar 
        onLogout={handleLogout} 
        onSettings={() => setView('pricing')} 
        activeView={view} 
        onNavigate={handleSidebarClick} 
        lang={language} 
        currentPhaseIndex={getCurrentPhaseIndex()} 
      />
      
      <main className="flex-1 md:ml-72 relative min-h-screen transition-all duration-300">
         <div className="md:hidden flex justify-between items-center p-6 border-b border-white/5">
            <span className="text-white font-bold">upGrowt</span>
            <button onClick={handleLogout} className="text-slate-400 text-sm">Salir</button>
         </div>

         <div className="w-full max-w-7xl mx-auto p-4 md:p-8 lg:p-12">
            {children}
         </div>
      </main>
    </div>
  );
  
  if (view === 'roadmap' && strategy && profile) {
    return (
      <MainLayout>
         <RoadmapView phases={strategy.roadmap} profile={profile} lang={language} onStartPriority={handleStartPriority} />
      </MainLayout>
    );
  }

  if (view === 'wow' && strategy) return <WowMoment focus={strategy.priorityFocus} onContinue={handleWowContinue} />;
  
  if (view === 'completion') return <CompletionSuccess onNext={handleEnterWeeklyMode} lang={language} />;
  
  if (view === 'pricing') return <Pricing onBack={() => setView(weeklyPlan ? 'weekly_agency' : 'dashboard')} />;

  if (view === 'weekly_agency' && profile && weeklyPlan && strategy) {
    return (
      <MainLayout>
         <WeeklyAgencyDashboard plan={weeklyPlan} profile={profile} lang={language} onUpdateTask={handleUpdateWeeklyTask} strategy={strategy} />
      </MainLayout>
    );
  }

  if (view === 'dashboard' && profile && strategy) {
    return (
      <MainLayout>
         <DashboardHome strategy={strategy} profile={profile} businessName={profile.businessName} onCompletePriority={handleCompletePriority} activeSidebarAction={sidebarAction} lang={language} onUpdateExecution={handleUpdateExecution} savedExecutionState={executionState} />
      </MainLayout>
    );
  }

  // FALLBACK SAFEGUARD: If we get here, something is wrong with the state logic.
  console.warn("⚠️ Invalid state reached. Redirecting to Auth.");
  return <AuthView onSuccess={handleAuthSuccess} />;
}

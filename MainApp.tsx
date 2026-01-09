
import React, { useState, useEffect, useRef } from 'react';
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
import { saveBusinessProfile, loadUserData, saveUserProgress, UserData } from './services/business.service';
import { signOut } from './services/auth.service';
import { UserProfile, ComprehensiveStrategy, Language, BusinessAudit, ExecutionState, WeeklyAgencyPlan } from './types';
import { t } from './utils/i18n';
import { supabase, isSupabaseConfigured } from './lib/supabase';

type ViewState = 'auth' | 'transition' | 'onboarding' | 'report' | 'roadmap' | 'wow' | 'dashboard' | 'completion' | 'pricing' | 'weekly_agency' | 'loading' | 'error';

export default function MainApp() {
  const [view, setView] = useState<ViewState>('loading');
  const [appError, setAppError] = useState<string | null>(null);
  
  const [session, setSession] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [audit, setAudit] = useState<BusinessAudit | null>(null);
  const [strategy, setStrategy] = useState<ComprehensiveStrategy | null>(null);
  const [executionState, setExecutionState] = useState<ExecutionState>({});
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyAgencyPlan | null>(null);

  const [loadingMessage, setLoadingMessage] = useState<string>('Conectando con el servidor...');
  const [streamingLog, setStreamingLog] = useState<string>('');
  const [language, setLanguage] = useState<Language>('es');
  const [sidebarAction, setSidebarAction] = useState<string>('');
  const [showSlowLoading, setShowSlowLoading] = useState(false);

  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [isWaitingForStrategy, setIsWaitingForStrategy] = useState(false);
  const [shouldRecoverStrategy, setShouldRecoverStrategy] = useState(false);

  const isFetchingRef = useRef(false);

  // --- EFFECT: DETECT SLOW LOADING (COLD START HANDLING) ---
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let wakeUpTimer: ReturnType<typeof setTimeout>;

    if (view === 'loading') {
      // 1. Mensaje de "Despertando" a los 4 segundos
      wakeUpTimer = setTimeout(() => {
        setLoadingMessage('Despertando base de datos (esto puede tardar unos segundos)...');
      }, 4000);

      // 2. Botón de reinicio a los 15 segundos (Damos tiempo para el Cold Start que suele ser ~10s)
      timer = setTimeout(() => {
        console.warn("⏳ Loading is taking longer than expected...");
        setShowSlowLoading(true);
        setLoadingMessage('El servidor está tardando más de lo normal...');
      }, 15000);
    } else {
      setShowSlowLoading(false);
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(wakeUpTimer);
    };
  }, [view]);

  // --- 1. SESSION MANAGEMENT ---
  useEffect(() => {
    // Immediate configuration check
    if (!isSupabaseConfigured()) {
      setView('auth');
      return;
    }

    // Initialize Session Check
    const initSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
           console.error("Session Init Error:", error);
           setView('auth');
           return;
        }

        if (initialSession) {
          setSession(initialSession);
          // Sync logic handleará el resto
        } else {
          // No hay sesión, vamos al login
          setView('auth');
        }
      } catch (e) {
        console.error("Unexpected Session Error:", e);
        setView('auth');
      }
    };

    initSession();

    // Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        // Full reset on logout
        setBusinessId(null);
        setProfile(null);
        setStrategy(null);
        isFetchingRef.current = false;
        setView('auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- 2. DATA SYNC ---
  useEffect(() => {
    const syncData = async () => {
      // Only sync if we have a user, we aren't already syncing, and we haven't loaded data yet
      if (!session?.user?.id || isFetchingRef.current || businessId) return;

      isFetchingRef.current = true;
      setView('loading');
      setLoadingMessage('Sincronizando perfil...');
      setShowSlowLoading(false);

      try {
        console.log("🔄 Starting data load for user:", session.user.id);
        const data: UserData | null = await loadUserData(session.user.id);
        
        if (!data) {
           throw new Error("AUTH_SYNC_FAILED");
        }

        const { businessId: bId, profile: uProfile, strategy: uStrategy, weeklyPlan: uPlan } = data;

        // New User -> Onboarding
        if (!bId || !uProfile) {
          console.log("🆕 New User Detected");
          setView('transition'); 
          isFetchingRef.current = false;
          return;
        }

        // Existing User -> Dashboard
        console.log("✅ Data Loaded Successfully");
        setBusinessId(bId);
        setProfile(uProfile);
        
        if (uProfile.language) setLanguage(uProfile.language);
        if (data.executionState) setExecutionState(data.executionState);
        if (uPlan) setWeeklyPlan(uPlan);

        if (uStrategy) {
           setStrategy(uStrategy);
           setAudit(uStrategy.audit);
           setView(uPlan ? 'weekly_agency' : 'dashboard');
        } else {
           console.log("⚠️ Profile found but no strategy. Attempting recovery.");
           setShouldRecoverStrategy(true);
           setView('dashboard'); 
        }

      } catch (err: any) {
        console.error("❌ Sync Error:", err);
        // Si falla la sincronización, no forzamos logout inmediatamente, dejamos que el usuario decida
        // o reintentamos
        setLoadingMessage('Error al cargar datos. Reintentando...');
        setTimeout(() => {
           // Si falla repetidamente, mostramos error
           if (isFetchingRef.current) {
              handleForcedLogout("Error de conexión. Por favor reingresa.");
           }
        }, 5000);
      } finally {
        isFetchingRef.current = false;
      }
    };

    syncData();
  }, [session, businessId]); 

  const handleForcedLogout = async (msg?: string) => {
    console.log("🛑 Forced Logout Triggered:", msg);
    // 1. Reset local state immediately to unblock UI
    setAppError(msg || null);
    isFetchingRef.current = false;
    
    // 2. Try to sign out from Supabase (don't await indefinitely)
    signOut().catch(e => console.error("SignOut error:", e));
    
    // 3. Force view to auth
    setSession(null); 
    setView('auth');
  };

  const handleResetApp = () => {
    window.location.reload();
  };

  // --- 3. RECOVERY & GENERATION LOGIC ---
  useEffect(() => {
    if (shouldRecoverStrategy && profile && session && !isPlanGenerating) {
      setShouldRecoverStrategy(false);
      handleProfileSave(profile);
    }
  }, [shouldRecoverStrategy, profile, session]);

  useEffect(() => {
    if (isWaitingForStrategy && strategy) {
      setIsWaitingForStrategy(false);
      setView('roadmap');
    }
  }, [strategy, isWaitingForStrategy]);


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
      console.error("Error generating strategy:", err);
    } finally {
      setIsPlanGenerating(false);
    }
  };

  const handleProfileSave = async (profileData: UserProfile) => {
    if (!session?.user?.id) return;

    setView('loading');
    setLoadingMessage('Guardando perfil y generando análisis...');
    
    try {
      const business = await saveBusinessProfile(session.user.id, profileData);
      setBusinessId(business.id);
      
      // Move to report view immediately to show progress
      setView('report'); 

      const generatedAudit = await generateAuditStream(profileData, language, (text) => {
        setStreamingLog(text);
      });
      
      setAudit(generatedAudit);
      setStreamingLog(''); 
      triggerStrategyGeneration(profileData, generatedAudit, business.id);
      
    } catch (e: any) {
      console.error("Save Profile Error:", e);
      if (businessId) setView('dashboard');
      else {
        setAppError("Error guardando el perfil. Intenta de nuevo.");
        setView('onboarding');
      }
    }
  };

  const handleAuthSuccess = async () => {
     // Session update triggers the syncData effect
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

    setView('loading');
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
    }
  };

  const handleLogout = async () => {
    setView('loading');
    setLoadingMessage('Cerrando sesión...');
    await handleForcedLogout();
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
           <div className="text-5xl mb-4">🔌</div>
           <h2 className="text-2xl font-bold text-white mb-2">Conexión Interrumpida</h2>
           <p className="text-slate-400 mb-6">{appError || "Ocurrió un error inesperado al cargar tus datos."}</p>
           <Button onClick={() => window.location.reload()}>Reintentar Conexión</Button>
           <button onClick={() => handleForcedLogout()} className="block mx-auto mt-4 text-slate-500 text-xs hover:text-white underline">
             Cerrar Sesión y Salir
           </button>
        </div>
      </div>
    );
  }

  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
         <Loading 
            message={loadingMessage} 
            subMessage={isPlanGenerating ? "Generando estrategia maestra..." : undefined}
            streamLog={streamingLog}
            showReset={showSlowLoading}
            onReset={handleForcedLogout}
         />
      </div>
    );
  }

  if (view === 'auth') return <AuthView onSuccess={handleAuthSuccess} />;
  if (view === 'transition') return <TransitionScreen onComplete={handleTransitionComplete} />;
  
  if (view === 'onboarding') {
    return (
      <>
        <LanguageSwitcher currentLang={language} onToggle={handleLanguageChange} />
        <div className="absolute top-6 left-6 z-50">
           <button onClick={handleLogout} className="text-slate-500 text-xs hover:text-white transition-colors">Salir</button>
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

  return <AuthView onSuccess={handleAuthSuccess} />;
}

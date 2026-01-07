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
          // --- EXISTING USER LOGIC ---
          setBusinessId(data.businessId);
          setProfile(data.profile);
          if (data.profile.language) setLanguage(data.profile.language);
          
          if (data.executionState) setExecutionState(data.executionState);
          if (data.weeklyPlan) setWeeklyPlan(data.weeklyPlan as WeeklyAgencyPlan);

          if (data.strategy) {
            // FULLY ONBOARDED
            setStrategy(data.strategy);
            setAudit(data.strategy.audit);
            
            if (data.weeklyPlan) {
              setView('weekly_agency');
            } else {
              setView('dashboard');
            }
          } else {
             // PROFILE EXISTS BUT NO STRATEGY (Incomplete flow or error)
             // CRITICAL FIX: Do NOT redirect to onboarding. Recover state.
             console.log("Profile found, recovering strategy...");
             setShouldRecoverStrategy(true);
             // Keep view in loading or move to report to prevent onboarding flash
          }
        } else {
          // --- NEW USER LOGIC ---
          // Only show onboarding if NO profile exists in DB
          setView('transition');
        }
      } catch (e: any) {
        console.error("Load Error", e);
        if (mounted) {
           if (e.message?.includes('column') || e.code === '42703') {
             setAppError("Error de Base de Datos: Faltan columnas necesarias. Contacte soporte.");
             setView('error');
           } else {
             setView('auth');
           }
        }
      } finally {
        if (mounted && !shouldRecoverStrategy) setIsLoading(false);
      }
    };

    const initAuth = async () => {
      setIsLoading(true);
      setLoadingMessage('Conectando con UpGrowth...');
      
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (initialSession?.user) {
        setSession(initialSession);
        await loadDataForUser(initialSession.user.id);
      } else {
        setIsLoading(false);
        setView('auth');
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          if (newSession.user.id !== session?.user?.id) {
            setSession(newSession);
            await loadDataForUser(newSession.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
            setSession(null);
            setView('auth');
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    initAuth();
  }, []); 

  // --- SAVE STRATEGY SNAPSHOT ---
  useEffect(() => {
    if (session && businessId && profile && strategy && !isLoading) {
       saveStrategySnapshot(businessId, profile, strategy).catch(console.error);
    }
  }, [strategy, session, businessId, profile, isLoading]);

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
      
      setIsPlanGenerating(true);
      generateActionPlan(profileData, generatedAudit, language)
        .then(plan => {
          setStrategy({ ...plan, audit: generatedAudit });
          setIsPlanGenerating(false);
          saveStrategySnapshot(business.id, profileData, { ...plan, audit: generatedAudit });
        })
        .catch(err => {
          console.error("Strategy Gen Error", err);
          setIsPlanGenerating(false);
        });

      setView('report'); 
      
    } catch (e: any) {
      console.error(e);
      // Only go back to onboarding if save failed completely
      if (!businessId) setView('onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (userId: string) => {
    const currentSession = await getSession();
    setSession(currentSession);
    // Let the useEffect load data, don't force transition yet
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
         alert("La estrategia aún se está generando. Por favor espera.");
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
      setView('weekly_agency');
    } catch (e) {
      console.error(e);
      setView('dashboard'); 
    } finally {
        setIsLoading(false);
    }
  };

  // --- CRITICAL LOGOUT FIX ---
  const handleLogout = async () => {
    try {
        setIsLoading(true);
        // 1. Clear Supabase Session
        await signOut();
        // 2. Nuclear option: Clear Local Storage to prevent stale state
        localStorage.clear();
        // 3. Reset internal state
        setSession(null);
        setProfile(null);
        setStrategy(null);
        // 4. Force hard reload to login
        window.location.href = '/';
    } catch (error) {
        console.error("Logout failed", error);
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
           <h2 className="text-2xl font-bold text-white mb-2">Error de Sistema</h2>
           <p className="text-slate-400 mb-6">{appError}</p>
           <Button onClick={() => window.location.reload()}>Recargar Aplicación</Button>
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

  // --- MAIN LAYOUT STRUCTURE (Fixing Alignment) ---
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
         {/* Top Mobile Header */}
         <div className="md:hidden flex justify-between items-center p-6 border-b border-white/5">
            <span className="text-white font-bold">upGrowt</span>
            <button onClick={handleLogout} className="text-slate-400 text-sm">Salir</button>
         </div>

         {/* Centered Content Container - Max Width 7xl for Premium Feel */}
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

  return <Loading />;
}
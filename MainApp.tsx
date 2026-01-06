
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

// NEW: Added 'transition' state
type ViewState = 'loading' | 'auth' | 'transition' | 'onboarding' | 'report' | 'roadmap' | 'wow' | 'dashboard' | 'completion' | 'pricing' | 'weekly_agency';

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

  // --- INITIALIZATION ---
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      setLoadingMessage('Conectando con UpGrowth...');
      
      const currentSession = await getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        // Load Data from Supabase
        setLoadingMessage('Sincronizando estrategia...');
        try {
          const data = await loadUserData(currentSession.user.id);
          
          if (data && data.profile) {
            // Existing user with profile -> Go to App
            setBusinessId(data.businessId);
            setProfile(data.profile);
            if (data.profile.language) setLanguage(data.profile.language);
            
            if (data.executionState) setExecutionState(data.executionState);
            if (data.weeklyPlan) setWeeklyPlan(data.weeklyPlan as WeeklyAgencyPlan);

            if (data.strategy) {
              setStrategy(data.strategy);
              setAudit(data.strategy.audit);
              
              if (data.weeklyPlan) {
                setView('weekly_agency');
              } else {
                setView('dashboard');
              }
            } else {
              // Profile exists but no strategy? Rare edge case, maybe go to report or onboarding
               setView('onboarding'); 
            }
          } else {
            // User exists but NO profile -> They just logged in for the first time
            // Trigger Transition first, then Welcome
            setView('transition');
          }
        } catch (e) {
          console.error("Load Error", e);
          setView('auth'); // Error loading? Re-auth.
        }
      } else {
        // No session -> Auth Screen (Start here)
        setView('auth');
      }
      setIsLoading(false);
    };

    initApp();
  }, []);

  // --- SAVE STRATEGY SIDE EFFECT ---
  useEffect(() => {
    if (session && businessId && profile && strategy && !isLoading) {
       saveStrategySnapshot(businessId, profile, strategy).catch(console.error);
    }
  }, [strategy, session, businessId, profile]);


  // --- HANDLERS ---

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    if (profile) {
      setProfile({ ...profile, language: lang });
    }
  };

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    // When onboarding completes, we SAVE the profile and move to Report
    // This is different from the old flow which went Onboarding -> Auth -> Report
    // New flow: Auth -> Transition -> Onboarding -> Report
    setProfile(newProfile);
    handleProfileSave(newProfile);
  };

  const handleProfileSave = async (profileData: UserProfile) => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    setLoadingMessage('Guardando perfil...');
    
    try {
      const business = await saveBusinessProfile(session.user.id, profileData);
      setBusinessId(business.id);
      setView('report'); // Directly to report logic which triggers AI gen
    } catch (e) {
      console.error(e);
      alert("Error al guardar perfil. Intenta de nuevo.");
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (userId: string) => {
    // Auth success -> Go to Transition
    // Note: session state update happens via initApp usually, but for immediate UI feedback:
    const currentSession = await getSession();
    setSession(currentSession);
    setView('transition');
  };
  
  const handleTransitionComplete = () => {
    // After transition, go to Welcome Screen (Onboarding Step 0)
    setView('onboarding');
  };

  // ... (Other handlers remain the same) ...
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
       setView('roadmap');
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
      setSession(null);
      setProfile(null);
      setStrategy(null);
      setAudit(null);
      setExecutionState({});
      setWeeklyPlan(null);
      setView('auth'); // Back to login
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

  // 1. Auth View (Entry Point)
  if (view === 'auth') {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  // 2. Transition Screen
  if (view === 'transition') {
    return <TransitionScreen onComplete={handleTransitionComplete} />;
  }

  // 3. Onboarding (Welcome -> Form)
  if (view === 'onboarding') {
    return (
      <>
        <LanguageSwitcher currentLang={language} onToggle={handleLanguageChange} />
        {/* Logout button in case user is stuck in onboarding loop */}
        <div className="absolute top-6 left-6 z-50">
           <button onClick={handleLogout} className="text-slate-500 text-xs hover:text-white">Salir</button>
        </div>
        <Onboarding onComplete={handleOnboardingComplete} />
      </>
    );
  }

  // 4. Main App Views
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

  if (view === 'roadmap' && strategy && profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar onLogout={handleLogout} onSettings={() => setView('pricing')} activeView={view} onNavigate={handleSidebarClick} lang={language} currentPhaseIndex={getCurrentPhaseIndex()} />
        <main className="flex-1 md:ml-64 relative overflow-x-hidden">
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
        <main className="flex-1 md:ml-64 p-4 md:p-8 relative">
           <div className="md:hidden flex justify-between mb-6 mt-12"><span className="text-white font-bold">upGrowt</span><button onClick={handleLogout} className="text-slate-400 text-sm">Salir</button></div>
           <WeeklyAgencyDashboard plan={weeklyPlan} profile={profile} lang={language} onUpdateTask={handleUpdateWeeklyTask} strategy={strategy} />
        </main>
      </div>
    );
  }

  if (view === 'dashboard' && profile && strategy) {
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar onLogout={handleLogout} onSettings={() => setView('pricing')} activeView={view} onNavigate={handleSidebarClick} lang={language} currentPhaseIndex={getCurrentPhaseIndex()} />
        <main className="flex-1 md:ml-64 p-4 md:p-8 relative">
           <div className="md:hidden flex justify-between mb-6 mt-12"><span className="text-white font-bold">upGrowt</span><button onClick={handleLogout} className="text-slate-400 text-sm">Salir</button></div>
           <DashboardHome strategy={strategy} profile={profile} businessName={profile.businessName} onCompletePriority={handleCompletePriority} activeSidebarAction={sidebarAction} lang={language} onUpdateExecution={handleUpdateExecution} savedExecutionState={executionState} />
        </main>
      </div>
    );
  }

  return <Loading />;
}

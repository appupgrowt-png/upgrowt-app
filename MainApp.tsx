
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
import { generateAuditStream, generateActionPlan, generateWeeklyAgencyPlan } from './services/geminiService';
import { saveBusinessProfile, saveStrategySnapshot, loadUserData, saveUserProgress } from './services/business.service';
import { getSession, signOut } from './services/auth.service';
import { UserProfile, ComprehensiveStrategy, Language, BusinessAudit, ExecutionState, WeeklyAgencyPlan } from './types';
import { t } from './utils/i18n';

type ViewState = 'loading' | 'auth' | 'onboarding' | 'report' | 'roadmap' | 'wow' | 'dashboard' | 'completion' | 'pricing' | 'weekly_agency';

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
            setBusinessId(data.businessId);
            setProfile(data.profile);
            if (data.profile.language) setLanguage(data.profile.language);
            
            // Load Execution State from DB (Priority over local)
            if (data.executionState && Object.keys(data.executionState).length > 0) {
              setExecutionState(data.executionState);
            }

            // Load Weekly Plan from DB
            if (data.weeklyPlan) {
              setWeeklyPlan(data.weeklyPlan as WeeklyAgencyPlan);
            }

            if (data.strategy) {
              setStrategy(data.strategy);
              setAudit(data.strategy.audit);
              
              // Router Logic based on loaded data
              if (data.weeklyPlan) {
                setView('weekly_agency');
              } else {
                setView('dashboard');
              }
            } else {
              setView('onboarding'); 
            }
          } else {
            setView('onboarding');
          }
        } catch (e) {
          console.error("Load Error", e);
          setView('onboarding');
        }
      } else {
        setView('onboarding');
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
    setProfile(newProfile);
    setView('auth'); 
  };

  const handleAuthSuccess = async (userId: string) => {
    if (!profile) return;
    
    setIsLoading(true);
    setLoadingMessage('Guardando perfil...');
    
    try {
      const business = await saveBusinessProfile(userId, profile);
      setBusinessId(business.id);
      const sess = await getSession();
      setSession(sess);
      setView('report');
    } catch (e) {
      console.error(e);
      alert("Error al guardar perfil. Intenta de nuevo.");
      setView('auth');
    } finally {
      setIsLoading(false);
    }
  };

  // --- GENERATION LOGIC ---
  useEffect(() => {
    if ((view === 'report' || view === 'dashboard') && profile && !audit && !isLoading && !strategy) {
      const runGenerationSequence = async () => {
        const auditResult = await generateAuditStream(profile, language, (text) => setStreamingLog(text));
        setAudit(auditResult);
        setStreamingLog('');
        
        setIsPlanGenerating(true);
        try {
          const planResult = await generateActionPlan(profile, auditResult, language);
          const fullStrategy: ComprehensiveStrategy = { audit: auditResult, ...planResult };
          setStrategy(fullStrategy); 
        } catch (err) {
          console.error("Plan Error", err);
        } finally {
          setIsPlanGenerating(false);
        }
      };
      runGenerationSequence();
    }
  }, [view, profile, audit, isLoading, language, strategy]);


  // --- VIEW TRANSITIONS ---

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
      
      // Save newly generated plan to DB immediately
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
      setView('onboarding');
    }
  };

  // --- PERSISTENCE HANDLERS (UPDATED) ---

  const handleUpdateExecution = (stepIndex: number, data: Record<string, string>) => {
    const newState = { ...executionState, [stepIndex]: data };
    setExecutionState(newState);
    
    // Save to DB
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
    
    // Save to DB
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

  // Auth Wall
  if (view === 'auth') {
    return (
      <AuthView 
        initialMode="register" 
        onSuccess={handleAuthSuccess} 
        onCancel={() => setView('onboarding')} 
      />
    );
  }

  // Onboarding (Guest View)
  if (view === 'onboarding') {
    return (
      <>
        <LanguageSwitcher currentLang={language} onToggle={handleLanguageChange} />
        <div className="relative">
           <div className="absolute top-6 left-6 z-50">
             <Button variant="ghost" onClick={() => setView('auth')} className="text-xs">
               Ya tengo cuenta
             </Button>
           </div>
           <Onboarding onComplete={handleOnboardingComplete} />
        </div>
      </>
    );
  }

  // Authenticated Views
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


import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { loadUserData, saveBusinessProfile, updateOnboardingProgress, saveUserProgress, resetUserAccount, UserData, UserAppState } from './services/business.service';
import { signOut } from './services/auth.service';
import { UserProfile, ComprehensiveStrategy, ExecutionState, WeeklyAgencyPlan } from './types';

// Components
import { AuthView } from './components/AuthView';
import { Onboarding } from './components/Onboarding';
import { StrategyGenerator } from './components/StrategyGenerator';
import { ConsultancyReport } from './components/ConsultancyReport';
import { RoadmapView } from './components/RoadmapView';
import { DashboardHome } from './components/DashboardHome';
import { WeeklyAgencyDashboard } from './components/WeeklyAgencyDashboard';
import { WowMoment } from './components/WowMoment';
import { CompletionSuccess } from './components/CompletionSuccess';
import { Sidebar } from './components/Sidebar';
import { Loading } from './components/ui/Loading';
import { TransitionScreen } from './components/TransitionScreen';
import { Pricing } from './components/Pricing';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { generateWeeklyAgencyPlan } from './services/geminiService';

export default function MainApp() {
  // --- GLOBAL STATE ---
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<'INITIALIZING' | 'AUTH_REQUIRED' | 'LOADING_DATA' | 'APP_READY'>('INITIALIZING');
  
  // --- APP DATA ---
  const [appState, setAppState] = useState<UserAppState>('NEW_USER');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [strategy, setStrategy] = useState<ComprehensiveStrategy | null>(null);
  const [executionState, setExecutionState] = useState<ExecutionState>({});
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyAgencyPlan | null>(null);

  // --- UI STATE ---
  const [currentView, setCurrentView] = useState<string>('default'); // 'default' is determined by appState
  const [lang, setLang] = useState<'es'|'en'>('es');
  const [loadingMsg, setLoadingMsg] = useState('Iniciando sistema...');

  // 1. INITIALIZATION
  useEffect(() => {
    // If Supabase is not configured, we go straight to Auth Required to let user choose Demo Mode
    if (!isSupabaseConfigured()) {
      setStatus('AUTH_REQUIRED'); 
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setStatus(session ? 'LOADING_DATA' : 'AUTH_REQUIRED');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setStatus('AUTH_REQUIRED');
      else if (status === 'AUTH_REQUIRED') setStatus('LOADING_DATA'); 
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. DATA LOADING (The critical part)
  useEffect(() => {
    if (status === 'LOADING_DATA' && session?.user?.id) {
      setLoadingMsg("Sincronizando tu progreso...");
      loadUserData(session.user.id)
        .then((data: UserData) => {
          setAppState(data.status);
          setBusinessId(data.businessId);
          setProfile(data.profile);
          setStrategy(data.strategy);
          setExecutionState(data.executionState);
          setWeeklyPlan(data.weeklyPlan);
          
          if (data.profile?.language) setLang(data.profile.language as any);
          
          setStatus('APP_READY');
        })
        .catch(err => {
          console.error("Init Error:", err);
          alert("Error cargando datos. Por favor recarga.");
        });
    }
  }, [status, session]);

  // --- HANDLERS ---
  
  const handleAuthSuccess = (userId: string) => {
      // Called by AuthView. If demo mode, userId is 'demo-user'.
      setSession({ user: { id: userId, email: 'demo@upgrowth.ai' } });
      setStatus('LOADING_DATA');
  };

  const handleLogout = () => {
      if (!isSupabaseConfigured()) {
          setSession(null);
          setStatus('AUTH_REQUIRED');
          setAppState('NEW_USER');
      } else {
          signOut();
      }
  };

  const handleOnboardingComplete = async (newProfile: UserProfile) => {
    if (!session?.user?.id) return;
    setLoadingMsg("Guardando perfil...");
    setStatus('LOADING_DATA'); 
    try {
      const biz = await saveBusinessProfile(session.user.id, newProfile);
      setBusinessId(biz.id);
      setProfile(newProfile);
      setAppState('STRATEGY_GENERATION_NEEDED');
      setStatus('APP_READY');
    } catch (e) {
      console.error(e);
      alert("Error guardando perfil");
      setStatus('APP_READY');
    }
  };

  const handleStrategyComplete = (newStrategy: ComprehensiveStrategy) => {
    setStrategy(newStrategy);
    setAppState('READY');
    setCurrentView('report'); 
  };

  const handleWeeklyPlanGen = async () => {
    if (!profile) return;
    setLoadingMsg("Generando plan semanal...");
    setStatus('LOADING_DATA');
    try {
      const plan = await generateWeeklyAgencyPlan(profile, lang);
      setWeeklyPlan(plan);
      if (businessId) await saveUserProgress(session.user.id, businessId, 'weekly', plan);
      setStatus('APP_READY');
      setCurrentView('weekly_agency');
    } catch (e) {
      console.error(e);
      setStatus('APP_READY');
    }
  };

  const handleReset = async () => {
    if (confirm("¿Estás seguro de borrar todo?")) {
      setLoadingMsg("Reseteando cuenta...");
      setStatus('LOADING_DATA');
      await resetUserAccount(session.user.id);
      window.location.reload();
    }
  };

  // --- RENDERER ---

  if (status === 'INITIALIZING' || status === 'LOADING_DATA') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loading message={loadingMsg} />
      </div>
    );
  }

  if (status === 'AUTH_REQUIRED') {
    return <AuthView onSuccess={handleAuthSuccess} />;
  }

  // --- MAIN ROUTER ---

  // 1. Onboarding Flow
  if (appState === 'NEW_USER' || appState === 'ONBOARDING_IN_PROGRESS') {
    if (currentView === 'transition') {
      return <TransitionScreen onComplete={() => setCurrentView('onboarding_form')} userEmail={session.user.email} />;
    }
    // Default to onboarding form
    return (
      <>
        <div className="fixed top-4 right-4 z-50"><button onClick={handleLogout} className="text-slate-500 text-xs hover:text-white">Salir</button></div>
        <Onboarding 
          initialData={profile}
          onComplete={handleOnboardingComplete}
          onStepSave={(data) => updateOnboardingProgress(session.user.id, data)}
        />
      </>
    );
  }

  // 2. Strategy Generation Flow
  if (appState === 'STRATEGY_GENERATION_NEEDED') {
    return (
      <StrategyGenerator 
        profile={profile!} 
        businessId={businessId!} 
        onComplete={handleStrategyComplete}
        onError={(msg: string) => alert(msg)} 
        lang={lang}
      />
    );
  }

  // 3. Main Dashboard Flow (READY State)
  const MainLayout = ({ children }: any) => (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar 
        onLogout={handleLogout} 
        onSettings={() => setCurrentView('pricing')} 
        activeView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        lang={lang}
        currentPhaseIndex={2} // Mock for now
      />
      <main className="flex-1 md:ml-72 p-6 md:p-12 overflow-x-hidden">
        {children}
      </main>
    </div>
  );

  // Router within READY state
  const renderContent = () => {
    switch (currentView) {
      case 'report':
        return <ConsultancyReport profile={profile!} auditData={strategy!.audit} onContinue={() => setCurrentView('roadmap')} />;
      case 'roadmap':
        return <RoadmapView phases={strategy!.roadmap} profile={profile!} lang={lang} onStartPriority={() => setCurrentView('wow')} />;
      case 'wow':
        return <WowMoment focus={strategy!.priorityFocus} onContinue={() => setCurrentView('default')} />;
      case 'pricing':
        return <Pricing onBack={() => setCurrentView('default')} />;
      case 'weekly_agency':
        return weeklyPlan 
          ? <WeeklyAgencyDashboard plan={weeklyPlan} profile={profile!} lang={lang} strategy={strategy} onUpdateTask={() => {}} />
          : <div className="text-white">Error: No weekly plan</div>;
      case 'completion':
        return <CompletionSuccess onNext={handleWeeklyPlanGen} lang={lang} />;
      default:
        // Dashboard Home
        return (
          <DashboardHome 
            strategy={strategy!} 
            profile={profile!} 
            businessName={profile!.businessName} 
            onCompletePriority={() => setCurrentView('completion')}
            lang={lang}
            onUpdateExecution={(idx, data) => {
               const newState = { ...executionState, [idx]: data };
               setExecutionState(newState);
               saveUserProgress(session.user.id, businessId!, 'execution', newState);
            }}
            savedExecutionState={executionState}
          />
        );
    }
  };

  if (currentView === 'report' || currentView === 'roadmap' || currentView === 'wow' || currentView === 'completion' || currentView === 'pricing') {
    // Fullscreen views
    return (
      <>
         <div className="fixed top-4 right-4 z-50">
            <LanguageSwitcher currentLang={lang} onToggle={setLang} />
         </div>
         {renderContent()}
      </>
    );
  }

  // Standard Dashboard Layout
  return (
    <MainLayout>
      <div className="fixed top-4 right-4 z-50 flex gap-2">
         <button onClick={handleReset} className="px-3 py-1 bg-red-900/50 text-red-400 text-xs rounded border border-red-500/30">Reset</button>
         <LanguageSwitcher currentLang={lang} onToggle={setLang} />
      </div>
      {renderContent()}
    </MainLayout>
  );
}


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

// ESTADOS DEL SISTEMA
type ViewState = 'auth' | 'transition' | 'onboarding' | 'report' | 'roadmap' | 'wow' | 'dashboard' | 'completion' | 'pricing' | 'weekly_agency' | 'loading' | 'error';

export default function MainApp() {
  // --- STATE: CORE ---
  const [view, setView] = useState<ViewState>('loading');
  const [appError, setAppError] = useState<string | null>(null);
  
  // --- STATE: DATA ---
  const [session, setSession] = useState<any>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [audit, setAudit] = useState<BusinessAudit | null>(null);
  const [strategy, setStrategy] = useState<ComprehensiveStrategy | null>(null);
  const [executionState, setExecutionState] = useState<ExecutionState>({});
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyAgencyPlan | null>(null);

  // --- STATE: UI ---
  const [loadingMessage, setLoadingMessage] = useState<string>('Iniciando sistema...');
  const [streamingLog, setStreamingLog] = useState<string>('');
  const [language, setLanguage] = useState<Language>('es');
  const [sidebarAction, setSidebarAction] = useState<string>('');

  // --- STATE: GENERATION PROCESS ---
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);
  const [isWaitingForStrategy, setIsWaitingForStrategy] = useState(false);
  const [shouldRecoverStrategy, setShouldRecoverStrategy] = useState(false);

  // Ref para evitar loops de carga
  const isFetchingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // 1. GESTIÓN DE SESIÓN (FUENTE DE VERDAD)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // A. Check Configuración
    if (!isSupabaseConfigured()) {
      setView('auth');
      return;
    }

    // B. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (!initialSession) setView('auth');
    });

    // C. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        // Limpieza completa al cerrar sesión
        setBusinessId(null);
        setProfile(null);
        setStrategy(null);
        isFetchingRef.current = false;
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // 2. SINCRONIZACIÓN DE DATOS (REACTIVA A LA SESIÓN)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const syncData = async () => {
      // Solo sincronizar si hay usuario, no estamos cargando ya, y no tenemos datos aún
      if (!session?.user?.id || isFetchingRef.current || businessId) return;

      isFetchingRef.current = true;
      setView('loading');
      setLoadingMessage('Validando credenciales...');

      // TIMEOUT DE SEGURIDAD
      const timeoutId = setTimeout(() => {
        if (isFetchingRef.current) {
          console.error("⏰ Timeout de carga de datos.");
          handleForcedLogout("El servidor tardó demasiado en responder.");
        }
      }, 15000);

      try {
        // Uso explícito del tipo UserData para ayudar a TypeScript
        const data: UserData | null = await loadUserData(session.user.id);
        clearTimeout(timeoutId);

        if (!data) {
           throw new Error("AUTH_SYNC_FAILED");
        }

        // Extracción segura para evitar errores de tipo 'never'
        const { businessId: bId, profile: uProfile, strategy: uStrategy, weeklyPlan: uPlan } = data;

        // CASO A: Usuario Nuevo (Auth OK, DB vacía o incompleta) -> ONBOARDING
        if (!bId || !uProfile) {
          console.log("🆕 Usuario nuevo -> Onboarding");
          setView('transition'); 
          isFetchingRef.current = false;
          return;
        }

        // CASO B: Usuario Existente -> DASHBOARD
        console.log("✅ Datos cargados:", uProfile.businessName);
        setBusinessId(bId);
        setProfile(uProfile);
        
        // Restaurar estado
        if (uProfile.language) setLanguage(uProfile.language);
        if (data.executionState) setExecutionState(data.executionState);
        if (uPlan) setWeeklyPlan(uPlan);

        // Routing Inteligente
        if (uStrategy) {
           setStrategy(uStrategy);
           setAudit(uStrategy.audit);
           setView(uPlan ? 'weekly_agency' : 'dashboard');
        } else {
           // Perfil existe pero sin estrategia (error previo o interrupción)
           setShouldRecoverStrategy(true);
           // Si tenemos perfil, vamos al dashboard en modo limitado/recuperación
           setView('dashboard'); 
        }

      } catch (err: any) {
        clearTimeout(timeoutId);
        console.error("❌ Error Sync:", err);
        handleForcedLogout("No pudimos sincronizar tu cuenta. Por favor reingresa.");
      } finally {
        isFetchingRef.current = false;
      }
    };

    syncData();
  }, [session, businessId]); 

  const handleForcedLogout = async (msg?: string) => {
    console.log("⚠️ Ejecutando Logout Forzado");
    setAppError(msg || null);
    await signOut();
    isFetchingRef.current = false;
  };

  // ---------------------------------------------------------------------------
  // 3. AUTO-RECUPERACIÓN
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (shouldRecoverStrategy && profile && session && !isPlanGenerating) {
      console.log("🚑 Recuperando estrategia perdida...");
      setShouldRecoverStrategy(false);
      handleProfileSave(profile);
    }
  }, [shouldRecoverStrategy, profile, session]);

  // Navegación automática cuando la estrategia llega
  useEffect(() => {
    if (isWaitingForStrategy && strategy) {
      setIsWaitingForStrategy(false);
      setView('roadmap');
    }
  }, [strategy, isWaitingForStrategy]);


  // ---------------------------------------------------------------------------
  // 4. ACCIONES DE USUARIO
  // ---------------------------------------------------------------------------

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
      console.error("Error generando estrategia:", err);
    } finally {
      setIsPlanGenerating(false);
    }
  };

  const handleProfileSave = async (profileData: UserProfile) => {
    if (!session?.user?.id) return;

    setView('loading');
    setLoadingMessage('Guardando tu perfil...');
    
    try {
      const business = await saveBusinessProfile(session.user.id, profileData);
      setBusinessId(business.id);

      // UI update inmediata para feedback
      setLoadingMessage('Analizando tu negocio...');
      
      // Pasar a vista reporte mientras carga el stream
      setView('report'); 

      const generatedAudit = await generateAuditStream(profileData, language, (text) => {
        setStreamingLog(text);
      });
      
      setAudit(generatedAudit);
      setStreamingLog(''); 
      
      // Iniciar generación de estrategia en segundo plano
      triggerStrategyGeneration(profileData, generatedAudit, business.id);
      
    } catch (e: any) {
      console.error(e);
      // Si falla, intentamos salvar al usuario llevándolo a un lugar seguro
      if (businessId) setView('dashboard');
      else setView('onboarding');
    }
  };

  const handleAuthSuccess = async () => {
     // El useEffect de 'session' manejará la transición.
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
    await signOut();
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

  // ---------------------------------------------------------------------------
  // 5. RENDERIZADO DE VISTAS
  // ---------------------------------------------------------------------------

  if (view === 'error') {
     return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-center">
        <div className="glass-panel p-10 border-red-500/20 max-w-lg">
           <div className="text-5xl mb-4">🔌</div>
           <h2 className="text-2xl font-bold text-white mb-2">Conexión Interrumpida</h2>
           <p className="text-slate-400 mb-6">{appError || "Ocurrió un error inesperado al cargar tus datos."}</p>
           <Button onClick={() => window.location.reload()}>Reintentar</Button>
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
        isLoadingPlan={isPlanGenerating || isWaitingForStrategy} 
      />
    );
  }

  // --- MAIN APP LAYOUT ---
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

  // Fallback final por si algo escapa a la lógica
  return <AuthView onSuccess={handleAuthSuccess} />;
}

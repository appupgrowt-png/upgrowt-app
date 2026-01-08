
import React, { useState, useEffect, useCallback } from 'react';
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

// ESTADOS DEL SISTEMA
type SystemStatus = 'BOOTING' | 'CHECKING_SESSION' | 'FETCHING_DB' | 'READY' | 'ERROR';
type ViewState = 'auth' | 'transition' | 'onboarding' | 'report' | 'roadmap' | 'wow' | 'dashboard' | 'completion' | 'pricing' | 'weekly_agency';

export default function MainApp() {
  // --- STATE: SYSTEM ---
  const [status, setStatus] = useState<SystemStatus>('BOOTING');
  const [view, setView] = useState<ViewState>('auth');
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

  // ---------------------------------------------------------------------------
  // 1. LOGICA DE CARGA DE DATOS (Centralizada)
  // ---------------------------------------------------------------------------
  const syncUserData = useCallback(async (userId: string) => {
    setStatus('FETCHING_DB');
    setLoadingMessage('Sincronizando base de datos...');
    
    try {
      const data = await loadUserData(userId);
      
      if (!data) {
        throw new Error("Error crítico al leer la base de datos.");
      }

      // CASO A: Usuario Nuevo (Auth OK, DB vacía)
      if (!data.businessId || !data.profile) {
        console.log("🆕 Usuario nuevo detectado -> Onboarding");
        setBusinessId(null);
        setProfile(null);
        setView('transition'); // Animación de entrada -> Onboarding
        setStatus('READY');
        return;
      }

      // CASO B: Usuario Existente
      console.log("✅ Usuario existente cargado:", data.profile.businessName);
      setBusinessId(data.businessId);
      setProfile(data.profile);
      
      // Restaurar preferencias
      if (data.profile.language) setLanguage(data.profile.language);
      if (data.executionState) setExecutionState(data.executionState);
      if (data.weeklyPlan) setWeeklyPlan(data.weeklyPlan as WeeklyAgencyPlan);

      // Determinar Vista Basada en Progreso
      if (data.strategy) {
         setStrategy(data.strategy);
         setAudit(data.strategy.audit);
         
         if (data.weeklyPlan) {
           setView('weekly_agency');
         } else {
           setView('dashboard');
         }
      } else {
         // Edge Case: Perfil existe pero estrategia falló anteriormente
         console.warn("⚠️ Perfil encontrado sin estrategia. Iniciando recuperación.");
         setShouldRecoverStrategy(true);
         // No cambiamos la vista aquí, dejamos que el Effect de recuperación actúe
      }
      
      setStatus('READY');

    } catch (err: any) {
      console.error("❌ Database Sync Error:", err);
      setAppError("No pudimos cargar tu información. Revisa tu conexión.");
      setStatus('ERROR');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 2. BOOTSTRAP (Inicialización)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      // A. Check Config
      if (!isSupabaseConfigured()) {
        if (mounted) {
           console.warn("⚠️ Supabase no configurado.");
           setStatus('READY'); 
           setView('auth');
        }
        return;
      }

      // B. Check Session
      setStatus('CHECKING_SESSION');
      
      // Manejar OAuth Redirect (Hash en URL)
      // Si hay hash, dejamos que el listener onAuthStateChange lo capture, no hacemos getSession manual
      if (window.location.hash && window.location.hash.includes('access_token')) {
        console.log("🔄 OAuth Redirect detectado. Esperando listener...");
        return; 
      }

      const { data: { session: currentSession }, error } = await supabase.auth.getSession();

      if (mounted) {
        if (currentSession && !error) {
           console.log("👤 Sesión activa encontrada.");
           setSession(currentSession);
           await syncUserData(currentSession.user.id);
        } else {
           console.log("🔒 No hay sesión. Mostrando Login.");
           setStatus('READY');
           setView('auth');
        }
      }
    };

    bootstrap();

    // C. Auth Listener (Maneja Login, Logout y OAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
       console.log(`🔔 Auth Event: ${event}`);
       
       if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (newSession) {
             setSession(newSession);
             // Solo cargamos datos si no estamos ya en ello para evitar doble fetch
             if (status !== 'FETCHING_DB') {
                await syncUserData(newSession.user.id);
             }
          }
       } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          setStrategy(null);
          setBusinessId(null);
          setStatus('READY');
          setView('auth');
       }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncUserData]); // syncUserData es estable por useCallback

  // ---------------------------------------------------------------------------
  // 3. AUTO-RECUPERACIÓN Y NAVEGACIÓN
  // ---------------------------------------------------------------------------

  // Recuperar estrategia si falta (Caso "Limbo")
  useEffect(() => {
    if (shouldRecoverStrategy && profile && session && status === 'READY') {
      console.log("🚑 Ejecutando recuperación de estrategia...");
      setShouldRecoverStrategy(false);
      handleProfileSave(profile); // Re-inicia el proceso de generación
    }
  }, [shouldRecoverStrategy, profile, session, status]);

  // Navegar al roadmap cuando la estrategia esté lista
  useEffect(() => {
    if (isWaitingForStrategy && strategy) {
      setIsWaitingForStrategy(false);
      setView('roadmap');
    }
  }, [strategy, isWaitingForStrategy]);


  // ---------------------------------------------------------------------------
  // 4. HANDLERS DE ACCIÓN
  // ---------------------------------------------------------------------------

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    if (profile) setProfile({ ...profile, language: lang });
  };

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    handleProfileSave(newProfile);
  };

  // Lógica principal de generación IA
  const triggerStrategyGeneration = async (profileData: UserProfile, auditData: BusinessAudit, bizId: string) => {
    setIsPlanGenerating(true);
    try {
      const plan = await generateActionPlan(profileData, auditData, language);
      const fullStrategy = { ...plan, audit: auditData };
      setStrategy(fullStrategy);
      // La estrategia se guarda automáticamente en `saveStrategySnapshot` dentro del servicio si fuera necesario,
      // pero aquí lo mantenemos en memoria hasta que el usuario confirme o lo guardamos asíncronamente.
      // *Nota: Para esta implementación, asumimos guardado implícito en services o al final.*
    } catch (err) {
      console.error("Error generando estrategia:", err);
    } finally {
      setIsPlanGenerating(false);
    }
  };

  const handleProfileSave = async (profileData: UserProfile) => {
    if (!session?.user?.id) return;

    setStatus('FETCHING_DB'); // Usamos loading screen
    setLoadingMessage('Inicializando Director IA...');
    
    try {
      // 1. Guardar Perfil (Persistencia Inmediata)
      const business = await saveBusinessProfile(session.user.id, profileData);
      setBusinessId(business.id);

      // 2. Generar Auditoría (Stream)
      setStatus('READY'); // Liberamos pantalla para mostrar el Reporte cargando
      setView('report'); 
      // Nota: Pasamos a 'report' donde se mostrará el loading específico de auditoría
      
      // *Corrección UX*: Necesitamos generar el audit ANTES de mostrar el reporte completo
      // o mostrar el reporte en modo "skeleton/loading".
      // Para simplificar y robustez, generamos audit aquí con loading overlay:
      
      setStatus('FETCHING_DB');
      setLoadingMessage('Analizando tu negocio...');
      
      const generatedAudit = await generateAuditStream(profileData, language, (text) => {
        setStreamingLog(text);
      });
      
      setAudit(generatedAudit);
      setStreamingLog(''); 
      
      // 3. Disparar Estrategia en background
      triggerStrategyGeneration(profileData, generatedAudit, business.id);

      setStatus('READY');
      setView('report'); 
      
    } catch (e: any) {
      console.error(e);
      setStatus('READY');
      // Si falla, volvemos a una pantalla segura dependiendo de qué datos tenemos
      if (!businessId) setView('onboarding');
      else setView('dashboard'); 
    }
  };

  const handleAuthSuccess = async () => {
     // No hacemos nada manual. El listener onAuthStateChange se encargará.
     console.log("Auth View reporta éxito.");
  };
  
  const handleTransitionComplete = () => {
    setView('onboarding');
  };

  const handleReportContinue = () => {
    if (strategy) {
      setView('roadmap');
      return;
    }
    // Si el usuario hace click rápido y la IA sigue pensando:
    setIsWaitingForStrategy(true);
    if (!isPlanGenerating && profile && audit && businessId) {
      // Retry si se detuvo
      triggerStrategyGeneration(profile, audit, businessId);
    }
  };

  const handleStartPriority = () => setView('wow');
  const handleWowContinue = () => setView('dashboard');
  const handleCompletePriority = () => setView('completion');
  
  const handleEnterWeeklyMode = async () => {
    if (!profile) return;
    if (weeklyPlan) { setView('weekly_agency'); return; }

    setStatus('FETCHING_DB');
    setLoadingMessage(t('generating_week', language));
    try {
      const plan = await generateWeeklyAgencyPlan(profile, language);
      setWeeklyPlan(plan);
      if (session?.user?.id && businessId) {
        await saveUserProgress(session.user.id, businessId, 'weekly', plan);
      }
      setStatus('READY');
      setView('weekly_agency');
    } catch (e) {
      console.error(e);
      setStatus('READY');
      setView('dashboard'); 
    }
  };

  const handleLogout = async () => {
    setStatus('FETCHING_DB');
    setLoadingMessage('Cerrando sesión de forma segura...');
    await signOut();
    // El listener onAuthStateChange limpiará el estado y pondrá view='auth'
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
  // 5. RENDERIZADO (Máquina de Estados)
  // ---------------------------------------------------------------------------

  // PANTALLAS DE BLOQUEO (Loading / Error)
  if (status === 'BOOTING' || status === 'CHECKING_SESSION' || status === 'FETCHING_DB') {
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

  if (status === 'ERROR') {
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

  // PANTALLAS DE FLUJO PRINCIPAL (Solo cuando status === 'READY')

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

  // Layout para vistas internas
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

  // Fallback de seguridad: Si llegamos aquí y no hay vista válida, volvemos a Auth.
  console.warn("⚠️ Estado inalcanzable. Redirigiendo a Auth.");
  return <AuthView onSuccess={handleAuthSuccess} />;
}


import React, { useState, useEffect } from 'react';
import { ComprehensiveStrategy, RoadmapPhase, UserProfile, Language, ExecutionStep, ExecutionState } from '../types';
import { TacticalDeck } from './DashboardSections';
import { Button } from './ui/Button';
import { AIConsultant } from './AIConsultant';
import { WeeklyCheckin } from './WeeklyCheckin';
import { t } from '../utils/i18n';
import { generateModuleDeliverable } from '../services/geminiService';

interface DashboardHomeProps {
  strategy: ComprehensiveStrategy;
  profile: UserProfile;
  businessName: string;
  onCompletePriority: () => void;
  activeSidebarAction?: string;
  lang: Language;
  onUpdateExecution: (stepIndex: number, data: Record<string, string>) => void;
  savedExecutionState: ExecutionState;
}

// --- WEEKLY INSIGHTS (NEW) ---
const WeeklyInsights: React.FC<{ audit: any, lang: Language }> = ({ audit, lang }) => {
  if (!audit) return null;
  // Use data from audit to simulate weekly feedback loop
  const strength = audit.strengths?.[0] || "Compromiso con la calidad";
  const limit = audit.limitingFactors?.[0] || "Inconsistencia en canales";
  const opp = audit.growthOpportunity || "Estructurar oferta principal";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in mb-8 mt-8">
       {/* Strength */}
       <div className="bg-emerald-900/10 border border-emerald-500/20 p-6 rounded-xl h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3">
             <span className="text-emerald-400 font-bold text-lg">✔</span>
             <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{t('feedback_good', lang)}</h4>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed flex-1">{strength}</p>
       </div>

       {/* Limiting */}
       <div className="bg-orange-900/10 border border-orange-500/20 p-6 rounded-xl h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3">
             <span className="text-orange-400 font-bold text-lg">⚠️</span>
             <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest">{t('feedback_bad', lang)}</h4>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed flex-1">{limit}</p>
       </div>

       {/* Opportunity */}
       <div className="bg-primary-900/10 border border-primary-500/20 p-6 rounded-xl h-full flex flex-col">
          <div className="flex items-center gap-2 mb-3">
             <span className="text-primary-400 font-bold text-lg">🚀</span>
             <h4 className="text-xs font-bold text-primary-400 uppercase tracking-widest">{t('feedback_opp', lang)}</h4>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed flex-1">{opp}</p>
       </div>
    </div>
  );
};

// --- STEP WIZARD (MODAL) ---

const StepWizardModal: React.FC<{
  step: ExecutionStep;
  stepIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (stepIndex: number, data: Record<string, string>) => void;
  initialData: Record<string, string>;
  lang: Language;
}> = ({ step, stepIndex, isOpen, onClose, onSave, initialData, lang }) => {
  const [inputs, setInputs] = useState<Record<string, string>>(initialData || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setInputs(initialData || {});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onSave(stepIndex, inputs);
      setIsSaving(false);
      onClose();
    }, 800);
  };

  const filledCount = Object.keys(inputs).filter(k => inputs[k]?.trim()).length;
  const totalInputs = step.inputs.length;
  const progress = Math.round((filledCount / totalInputs) * 100);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl border-primary-500/30">
        
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/80 flex justify-between items-start">
          <div>
             <span className="text-xs font-bold text-primary-400 uppercase tracking-widest block mb-2">
               {lang === 'en' ? `Module ${stepIndex + 1}` : `Módulo ${stepIndex + 1}`}
             </span>
             <h2 className="text-2xl font-bold text-white leading-tight">{step.title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-2">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          
          {/* Conversational Guide */}
          <div className="bg-gradient-to-r from-primary-900/20 to-transparent border-l-2 border-primary-500 pl-5 py-2">
             <div className="flex items-center gap-2 mb-2">
               <span className="text-lg">🤝</span>
               <h3 className="text-sm font-bold text-white uppercase">{lang === 'en' ? 'Consultant\'s Note' : 'Nota del Consultor'}</h3>
             </div>
             <p className="text-slate-300 text-lg leading-relaxed whitespace-pre-line font-medium italic">
               "{step.guideContent}"
             </p>
          </div>

          {/* Inputs Section */}
          <div className="space-y-8">
             {step.inputs.map((field) => (
               <div key={field.id} className="space-y-3">
                  <label className="text-base font-medium text-white block border-b border-white/5 pb-2">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea 
                      value={inputs[field.id] || ''}
                      onChange={(e) => setInputs({...inputs, [field.id]: e.target.value})}
                      placeholder={field.placeholder}
                      className="glass-input w-full p-4 rounded-xl min-h-[120px] text-sm leading-relaxed"
                    />
                  ) : (
                    <input 
                      type="text"
                      value={inputs[field.id] || ''}
                      onChange={(e) => setInputs({...inputs, [field.id]: e.target.value})}
                      placeholder={field.placeholder}
                      className="glass-input w-full p-4 rounded-xl text-sm"
                    />
                  )}
               </div>
             ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-slate-900 flex justify-between items-center gap-4">
          <div className="hidden md:block text-xs text-slate-500">
             {progress}% {lang === 'en' ? 'Complete' : 'Completado'}
          </div>
          <div className="flex gap-3 w-full md:w-auto">
             <Button variant="ghost" onClick={onClose} className="flex-1 md:flex-none">
               {lang === 'en' ? 'Cancel' : 'Cancelar'}
             </Button>
             <Button onClick={handleSave} disabled={isSaving || filledCount === 0} className="flex-1 md:flex-none shadow-neon">
               {isSaving ? (lang === 'en' ? 'Syncing...' : 'Sincronizando...') : (lang === 'en' ? 'Save & Continue' : 'Guardar y Continuar')}
             </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- TRACKER COMPONENT WITH DELIVERABLE LOGIC ---

const GuidedExecutionTracker: React.FC<{ 
  moduleTitle: string;
  steps: ExecutionStep[]; 
  lang: Language;
  onUpdate: (stepIndex: number, data: Record<string, string>) => void;
  executionState: ExecutionState;
  onDeliverableReady: (text: string) => void;
  existingDeliverable?: string;
}> = ({ moduleTitle, steps, lang, onUpdate, executionState, onDeliverableReady, existingDeliverable }) => {
  
  const [modalOpen, setModalOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const completedCount = Object.keys(executionState).length;
  const progressPercentage = Math.round((completedCount / steps.length) * 100);
  const isAllStepsDone = completedCount === steps.length;

  const handleOpenStep = (index: number) => {
    setActiveStepIndex(index);
    setModalOpen(true);
  };

  const handleSaveStep = (index: number, data: Record<string, string>) => {
    onUpdate(index, data);
  };

  const handleGenerateDeliverable = async () => {
    setIsGenerating(true);
    
    // Flatten all inputs into a single context object
    const allInputs: Record<string, string> = {};
    steps.forEach((step, idx) => {
      const stepAnswers = executionState[idx] || {};
      step.inputs.forEach(input => {
        allInputs[input.label] = stepAnswers[input.id] || "(No answer)";
      });
    });

    try {
      const result = await generateModuleDeliverable(moduleTitle, allInputs, lang);
      onDeliverableReady(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
    <div className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden relative">
      
      {/* Tracker Header */}
      <div className="p-6 border-b border-white/5 bg-slate-900 flex justify-between items-center">
         <div>
           <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
             {t('execution_steps', lang)}
           </h3>
           <p className="text-xs text-slate-500 mt-1">
             {completedCount} / {steps.length} {lang === 'en' ? 'modules active' : 'módulos activos'}
           </p>
         </div>
         <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            ></div>
         </div>
      </div>

      {/* Steps List - GRID LAYOUT FOR WIDER SCREENS */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step, i) => {
          const isCompleted = executionState[i] && Object.keys(executionState[i]).length > 0;
          const isNext = !isCompleted && (i === 0 || (executionState[i-1] && Object.keys(executionState[i-1]).length > 0));

          return (
            <div 
              key={i} 
              className={`relative transition-all duration-500 ${
                isNext 
                  ? 'bg-gradient-to-r from-primary-900/20 to-slate-800 border border-primary-500/50 shadow-[0_0_30px_rgba(6,182,212,0.1)] scale-[1.01] z-10' 
                  : isCompleted 
                    ? 'bg-emerald-900/5 border border-emerald-500/10' 
                    : 'bg-slate-950/30 border border-white/5 opacity-60'
              } rounded-xl p-5 group flex flex-col h-full`}
            >
              <div className="flex gap-4 items-start h-full">
                {/* Indicator */}
                <div className="flex-shrink-0 mt-1">
                  {isCompleted ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">✓</div>
                  ) : isNext ? (
                    <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-primary-500 flex items-center justify-center text-primary-400 font-bold relative animate-pulse-slow">{i + 1}</div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 font-bold text-sm">🔒</div>
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="mb-4">
                    <h4 className={`text-lg font-bold leading-tight ${isCompleted ? 'text-emerald-400' : isNext ? 'text-white' : 'text-slate-500'}`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                      {step.description}
                    </p>
                  </div>
                  
                  <div>
                    {isCompleted ? (
                      <button onClick={() => handleOpenStep(i)} className="text-xs text-slate-500 hover:text-white underline decoration-dashed">
                         {lang === 'en' ? 'Edit' : 'Editar'}
                      </button>
                    ) : isNext ? (
                      <button onClick={() => handleOpenStep(i)} className="bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-neon transition-all hover:scale-105 w-full md:w-auto">
                        {lang === 'en' ? 'Start' : 'Iniciar'} →
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* GENERATE DELIVERABLE SECTION */}
      {isAllStepsDone && !existingDeliverable && (
        <div className="p-6 border-t border-white/10 bg-gradient-to-b from-slate-900 to-black/50 text-center animate-fade-in">
          <p className="text-slate-300 mb-4 font-medium">
            {lang === 'en' ? 'Great work. All inputs gathered.' : 'Gran trabajo. Hemos reunido toda la información.'}
          </p>
          <Button onClick={handleGenerateDeliverable} isLoading={isGenerating} className="w-full md:w-auto mx-auto shadow-neon text-lg px-8">
            {lang === 'en' ? '✨ Generate Strategic Document' : '✨ Generar Documento Estratégico'}
          </Button>
          <p className="text-[10px] text-slate-600 mt-2">
            {lang === 'en' ? 'AI will compile your answers into a professional report.' : 'La IA compilará tus respuestas en un reporte profesional.'}
          </p>
        </div>
      )}

      {/* DELIVERABLE DISPLAY */}
      {existingDeliverable && (
        <div className="p-6 border-t border-white/10 bg-slate-950 animate-fade-in">
           <div className="bg-white/5 border border-white/10 rounded-xl p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-primary-500"></div>
             <div className="absolute top-4 right-4 text-emerald-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             
             <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">Resultado Oficial</h3>
             <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-line">
               {existingDeliverable}
             </div>

             <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <Button variant="secondary" onClick={() => navigator.clipboard.writeText(existingDeliverable)}>
                   {lang === 'en' ? 'Copy Document' : 'Copiar Documento'}
                </Button>
             </div>
           </div>
        </div>
      )}

    </div>

    {/* Modal */}
    {activeStepIndex !== null && steps[activeStepIndex] && (
      <StepWizardModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        step={steps[activeStepIndex]}
        stepIndex={activeStepIndex}
        onSave={handleSaveStep}
        initialData={executionState[activeStepIndex] || {}}
        lang={lang}
      />
    )}
    </>
  );
};

// --- PRIORITY FOCUS HERO ---

const PriorityFocusHero: React.FC<{ 
  focus: any, 
  onComplete: () => void, 
  guidedAction: any, 
  assets: any,
  lang: Language,
  onUpdateExecution: (idx: number, data: Record<string, string>) => void,
  executionState: ExecutionState,
  profile: UserProfile
}> = ({ focus, onComplete, guidedAction, assets, lang, onUpdateExecution, executionState, profile }) => {
  const [showExecution, setShowExecution] = useState(false);
  const [deliverable, setDeliverable] = useState<string | undefined>(undefined);

  // Auto-expand
  useEffect(() => {
    if (Object.keys(executionState).length > 0) {
      setShowExecution(true);
    }
  }, [executionState]);

  return (
    <div id="hero-section" className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-surface to-background border border-primary-500/20 shadow-neon transition-all duration-500 w-full">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* COMPACT PADDING: Changed from p-12 to p-6/8 */}
      <div className="p-6 md:p-8 relative z-10 flex flex-col gap-6">
         
         {/* Top Section: Title Left, Context Right */}
         <div className="flex flex-col xl:flex-row gap-6 justify-between items-start">
            
            {/* Left Content */}
            <div className="flex-1 space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {t('priority_label', lang)}
                </div>

                <h2 className="text-3xl font-black text-white leading-tight">
                  {focus.title}
                </h2>
                
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('reasoning_label', lang)}</h4>
                  <p className="text-base text-slate-300 leading-relaxed max-w-3xl border-l-2 border-slate-700 pl-4">
                    {focus.reasoning}
                  </p>
                </div>

                {!showExecution && (
                  <div className="pt-2">
                    <Button onClick={() => setShowExecution(true)} className="px-8 py-3 text-sm shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                      {t('continue_action', lang)}
                    </Button>
                  </div>
                )}
            </div>

            {/* Right Context Card - Use h-fit to prevent stretching */}
            <div className="w-full xl:w-72 h-fit bg-slate-900/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm space-y-3 flex-shrink-0">
               <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">{t('impact_label', lang)}</span>
                  <p className="text-emerald-400 font-bold text-sm leading-tight">{focus.impact}</p>
               </div>
               <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">{t('unlocks_label', lang)}</span>
                  <p className="text-white font-medium text-xs leading-tight">{focus.unlocks}</p>
               </div>
               {focus.warning && (
                 <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest block mb-1">Nota del Director</span>
                    <p className="text-slate-400 text-[10px] italic leading-snug">{focus.warning}</p>
                 </div>
               )}
            </div>

         </div>

         {/* EXECUTION AREA (Full Width) */}
         {showExecution && (
           <div className="animate-fade-in space-y-8 border-t border-white/10 pt-6">
              
              {/* EXECUTION TRACKER & DELIVERABLE GENERATOR */}
              <div className="w-full">
                <GuidedExecutionTracker 
                  moduleTitle={focus.title}
                  steps={guidedAction.steps} 
                  lang={lang} 
                  onUpdate={onUpdateExecution}
                  executionState={executionState}
                  onDeliverableReady={(text) => setDeliverable(text)}
                  existingDeliverable={deliverable}
                />
              </div>
              
              {/* TACTICAL DECK (UPDATED WITH PROFILE) */}
              <div id="execution-section" className={deliverable ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}>
                 <TacticalDeck 
                    video={assets.video} 
                    copy={assets.staticCopy} 
                    trends={assets.trends}
                    lang={lang}
                    profile={profile} 
                 />
              </div>

              {deliverable && (
                <div className="pt-6 border-t border-white/10 flex justify-end animate-fade-in">
                   <Button onClick={onComplete} className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30">
                     {t('mark_completed', lang)}
                   </Button>
                </div>
              )}
           </div>
         )}
      </div>
    </div>
  );
};

const RoadmapLine: React.FC<{ phases: RoadmapPhase[]; lang: Language }> = ({ phases, lang }) => {
   return (
    <div id="roadmap-section" className="glass-panel p-6 border-white/5 flex flex-col h-fit">
      <div className="flex justify-between items-center mb-6">
         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('roadmap', lang)}</h3>
      </div>
      <div className="space-y-6 relative">
        <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-slate-800 z-0"></div>
        {phases.map((phase, i) => (
          <div key={i} className={`flex items-start gap-4 relative z-10 group ${phase.status === 'locked' ? 'opacity-60' : 'opacity-100'}`}>
             <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-300 bg-slate-950 ${
               phase.status === 'completed' ? 'border-emerald-500 text-emerald-400' :
               phase.status === 'active' ? 'border-primary-500 text-white shadow-neon scale-110' :
               'border-slate-800 text-slate-600'
             }`}>
               {phase.status === 'completed' ? '✓' : phase.status === 'active' ? '●' : <span className="text-xs">🔒</span>}
             </div>
             <div className="pt-1">
               <h4 className={`font-bold text-base leading-tight ${phase.status === 'active' ? 'text-white' : 'text-slate-400'}`}>{phase.phaseName}</h4>
               <p className="text-xs text-slate-500 font-medium italic mt-1">{phase.objective}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
   );
};

export const DashboardHome: React.FC<DashboardHomeProps> = ({ 
  strategy, 
  profile, 
  businessName, 
  onCompletePriority, 
  activeSidebarAction, 
  lang,
  onUpdateExecution,
  savedExecutionState
}) => {
  const [isConsultantOpen, setIsConsultantOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);

  useEffect(() => {
    if (activeSidebarAction === 'consultant') setIsConsultantOpen(true);
  }, [activeSidebarAction]);

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1800px] mx-auto space-y-8 animate-fade-in pb-20 px-4 md:px-6">
      {/* Header - Weekly Direction Ritual */}
      <div className="flex justify-between items-end pb-4 border-b border-white/5">
        <div>
           <p className="text-slate-500 text-sm uppercase tracking-widest mb-1">{t('weekly_dir_title', lang)}</p>
           <h1 className="text-xl md:text-2xl font-bold text-white max-w-3xl leading-tight">
             "{t('weekly_dir_sub', lang)}"
           </h1>
        </div>
        <button onClick={() => setIsCheckinOpen(true)} className="text-xs text-slate-500 hover:text-white underline decoration-dashed whitespace-nowrap ml-4">
          {t('weekly_ritual', lang)}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
         
         {/* Main Hero Section - Takes 8 cols on LG, 9 on XL */}
         <div className="lg:col-span-8 xl:col-span-9">
           <PriorityFocusHero 
              focus={strategy.priorityFocus} 
              guidedAction={strategy.guidedAction}
              assets={{ video: strategy.video, staticCopy: strategy.staticCopy, trends: strategy.trends }}
              onComplete={onCompletePriority}
              lang={lang}
              onUpdateExecution={onUpdateExecution}
              executionState={savedExecutionState}
              profile={profile} 
           />
           
           {/* Weekly Feedback Loop - Inserted here for immediate context */}
           <WeeklyInsights audit={strategy.audit} lang={lang} />
         </div>

         {/* Sidebar Section - Takes 4 cols on LG, 3 on XL */}
         <div className="lg:col-span-4 xl:col-span-3 space-y-6 sticky top-8 flex flex-col h-full">
            <RoadmapLine phases={strategy.roadmap} lang={lang} />
            <div className="glass-panel p-6 border-primary-500/20 bg-gradient-to-b from-primary-900/10 to-slate-900 cursor-pointer hover:border-primary-500/40 transition-colors" onClick={() => setIsConsultantOpen(true)}>
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 text-xl relative">
                    🤖
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">Consultor Senior</span>
                    <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">Online</span>
                  </div>
               </div>
               <p className="text-slate-300 text-sm leading-relaxed mb-4">"Estoy listo para redactar tu documento si has terminado los pasos."</p>
               <Button variant="ghost" className="w-full text-xs border border-white/10 hover:bg-white/5">Chat</Button>
            </div>
         </div>
      </div>

      <AIConsultant 
        isOpen={isConsultantOpen} 
        onClose={() => setIsConsultantOpen(false)} 
        profile={profile}
        strategy={strategy}
        executionState={savedExecutionState}
      />
      <WeeklyCheckin 
        isOpen={isCheckinOpen} 
        onClose={() => setIsCheckinOpen(false)}
        currentPriority={strategy.priorityFocus.title}
        lang={lang}
      />
    </div>
  );
};


import React, { useState } from 'react';
import { UserProfile, Tone } from '../types';
import { Button } from './ui/Button';
import { generateCoreMessage } from '../services/geminiService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

// --- CONSTANTS & OPTIONS ---

const BUSINESS_AGES = ['Estoy empezando', 'Menos de 1 año', '1–3 años', '3–5 años', 'Más de 5 años'];
const ACQUISITION_CHANNELS = ['Instagram', 'Facebook', 'TikTok', 'WhatsApp', 'Recomendaciones', 'Página web', 'Otro'];
const SALES_FRICTIONS = [
  'Preguntan precio y desaparecen', 
  'Preguntan mucho antes de decidir', 
  'Compran rápido', 
  'Comparan con otros', 
  'Aún no recibo muchos mensajes'
];
const CLIENT_TYPES = ['Personas', 'Negocios', 'Ambos'];
const CLIENT_WORRIES = ['Falta de tiempo', 'Falta de resultados', 'Confusión', 'Estrés', 'Falta de ventas', 'Otro'];
const WHY_CHOSEN = ['Precio', 'Rapidez', 'Trato personalizado', 'Resultados', 'Experiencia', 'Confianza', 'No estoy seguro'];
const ANTI_PERSONAS = ['Regateadores', 'Impacientes', 'Que no siguen procesos', 'Que no valoran el trabajo', 'Otro'];
const GOALS = ['Más mensajes', 'Más ventas', 'Más claridad', 'Mejor contenido', 'Menos estrés', 'Mejor organización'];
const FRUSTRATIONS = [
  'No sé qué publicar', 
  'Publico y no pasa nada', 
  'No tengo tiempo', 
  'He probado cosas y no funcionaron', 
  'No entiendo qué funciona'
];

// --- HELPER COMPONENTS ---

interface BtnProps {
  selected: boolean;
  label: string;
  onClick: () => void;
}

const CheckboxBtn: React.FC<BtnProps> = ({ selected, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group ${
      selected 
        ? 'bg-primary-500/20 border-primary-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-800 hover:border-white/10'
    }`}
  >
    <span className="font-medium text-sm md:text-base">{label}</span>
    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
      selected ? 'bg-primary-500 border-primary-500' : 'border-slate-600 group-hover:border-slate-500'
    }`}>
      {selected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
    </div>
  </button>
);

const RadioBtn: React.FC<BtnProps> = ({ selected, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-3 rounded-xl border text-center transition-all duration-200 text-sm md:text-base ${
      selected 
        ? 'bg-primary-500 text-white border-primary-500 shadow-neon font-bold' 
        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
    }`}
  >
    {label}
  </button>
);

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0 = Intro, 1-6 = Blocks, 7 = Loading
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    description: '', // What do you do?
    businessAge: '',
    acquisitionChannels: [] as string[],
    salesFriction: '',
    clientType: '', // Personas/Negocios
    clientDefinition: '', // "Personas que quieren..."
    clientPainPoints: [] as string[],
    whyChosen: [] as string[], // Strength
    antiPersona: [] as string[],
    goals: [] as string[],
    marketingFrustrations: [] as string[],
    links: { instagram: '', facebook: '', tiktok: '', website: '', other: '' }
  });

  // --- HELPERS ---

  const handleNext = () => {
    // Simple validation per step if needed
    if (step === 1 && (!formData.businessName || !formData.description)) return; // Basic check
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep(s => Math.max(0, s - 1));
    window.scrollTo(0, 0);
  };

  const toggleSelection = (field: keyof typeof formData, value: string) => {
    const current = formData[field] as string[];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: updated });
  };

  const updateLink = (key: string, val: string) => {
    setFormData({
      ...formData,
      links: { ...formData.links, [key]: val }
    });
  };

  // --- SUBMISSION ---

  const handleFinalSubmit = async () => {
    setStep(7); // Loading View
    setIsLoading(true);
    setError(null);

    try {
      // Generate Core Message first to have a complete profile
      // We use the new deep data to inform the core message better
      const strengthString = formData.whyChosen.join(', ') || "Servicio de calidad";
      const problemString = formData.clientPainPoints.join(', ') || "Necesidad general";
      
      const coreMessageData = await generateCoreMessage(
        formData.businessName, 
        `${formData.description}. Cliente ideal: ${formData.clientDefinition || formData.clientType}`, 
        strengthString, 
        problemString
      );

      const fullProfile: UserProfile = {
        businessName: formData.businessName,
        description: formData.description,
        offering: formData.description, // Mapped
        ticket: 'Medium ($50-$500)', // Inferred/Default
        salesProcess: 'Venta Inmediata', // Inferred/Default
        
        // Deep Context
        businessAge: formData.businessAge,
        acquisitionChannels: formData.acquisitionChannels,
        salesFriction: formData.salesFriction,
        clientType: formData.clientType,
        clientDefinition: formData.clientDefinition,
        targetAudience: formData.clientDefinition ? formData.clientDefinition : `Clientes tipo: ${formData.clientType}`,
        painPoints: formData.clientPainPoints,
        marketingFrustrations: formData.marketingFrustrations,
        goals: formData.goals,
        antiPersona: formData.antiPersona,
        whyChosen: formData.whyChosen,
        keyStrength: strengthString,
        
        links: formData.links,
        location: 'Online/Local',
        executionCapacity: 'Básico', // Can be inferred later
        postingFrequency: 'Diaria', // Added default
        tone: Tone.PROFESSIONAL,
        isConfigured: true,
        language: 'es',

        // Generated
        coreMessage: coreMessageData.message,
        solvedProblem: formData.clientPainPoints[0] || "Resolver problemas",
      };

      onComplete(fullProfile);
    } catch (e: any) {
      console.error(e);
      // Show explicit error to user
      setError(e.message || "Error de conexión con la IA. Verifica tu API Key.");
      setStep(6); // Go back if error
      setIsLoading(false);
    }
  };

  // --- RENDER BLOCKS ---

  // BLOCK 0: OPENING EMOTIONAL
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-md w-full glass-panel p-10 relative z-10 animate-fade-in-blur text-center border-t border-white/10">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-neon rotate-3">
            <span className="text-white font-bold text-2xl">up</span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black text-white mb-6 leading-tight">Vamos paso a paso.</h1>
          
          <div className="bg-slate-900/50 p-6 rounded-xl border border-white/5 mb-8 text-left space-y-4">
             <p className="text-slate-300 font-light flex gap-3 items-start">
               <span className="text-primary-500 mt-1">✓</span> No necesitas saber marketing.
             </p>
             <p className="text-slate-300 font-light flex gap-3 items-start">
               <span className="text-primary-500 mt-1">✓</span> Esto no es un examen, es una conversación.
             </p>
          </div>
          
          <Button onClick={handleNext} className="w-full text-lg shadow-neon py-4">
            Comenzar
          </Button>
          <p className="text-slate-600 text-xs mt-6 leading-relaxed">
            Responde como puedas. Si algo no sabes, no pasa nada.<br/> UpGrowth completa los espacios.
          </p>
        </div>
      </div>
    );
  }

  // BLOCK 1: BUSINESS BASICS
  if (step === 1) {
    return (
      <StepLayout 
        title="Empecemos por lo más fácil" 
        step={1} total={6} 
        onBack={handleBack} 
        onNext={handleNext}
        isNextDisabled={!formData.businessName || !formData.description}
      >
        <div className="space-y-8">
          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Cómo se llama tu negocio?</label>
             <input 
               type="text" 
               className="glass-input w-full p-4 rounded-xl text-lg" 
               placeholder="Nombre de tu marca..."
               value={formData.businessName}
               onChange={(e) => setFormData({...formData, businessName: e.target.value})}
               autoFocus
             />
          </div>

          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Qué hace tu negocio?</label>
             <textarea 
               className="glass-input w-full p-4 rounded-xl min-h-[100px] text-base leading-relaxed" 
               placeholder="Ej: Ayudamos a mujeres a sentirse seguras... / Vendemos café de especialidad... / Ofrecemos consultoría legal..."
               value={formData.description}
               onChange={(e) => setFormData({...formData, description: e.target.value})}
             />
          </div>

          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Desde cuándo existe tu negocio?</label>
             <div className="flex flex-wrap gap-2">
               {BUSINESS_AGES.map(age => (
                 <RadioBtn 
                   key={age} 
                   label={age} 
                   selected={formData.businessAge === age} 
                   onClick={() => setFormData({...formData, businessAge: age})}
                 />
               ))}
             </div>
          </div>
        </div>
      </StepLayout>
    );
  }

  // BLOCK 2: CURRENT REALITY
  if (step === 2) {
    return (
      <StepLayout 
        title="Cuéntanos cómo funciona hoy tu negocio" 
        step={2} total={6} 
        onBack={handleBack} 
        onNext={handleNext}
        microCopy="Queremos la realidad, no la versión perfecta."
      >
        <div className="space-y-8">
          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Cómo suelen llegar hoy tus clientes?</label>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {ACQUISITION_CHANNELS.map(ch => (
                 <CheckboxBtn 
                   key={ch} 
                   label={ch} 
                   selected={formData.acquisitionChannels.includes(ch)} 
                   onClick={() => toggleSelection('acquisitionChannels', ch)}
                 />
               ))}
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-white font-bold block">👉 Cuando alguien te escribe, ¿qué suele pasar?</label>
             <div className="space-y-2">
               {SALES_FRICTIONS.map(fric => (
                 <CheckboxBtn 
                   key={fric} 
                   label={fric} 
                   selected={formData.salesFriction === fric} // Treating as single select logic visually but using checkbox component for consistency
                   onClick={() => setFormData({...formData, salesFriction: fric})}
                 />
               ))}
             </div>
          </div>
        </div>
      </StepLayout>
    );
  }

  // BLOCK 3: CLIENT
  if (step === 3) {
    return (
      <StepLayout 
        title="Hablemos de las personas que te compran" 
        step={3} total={6} 
        onBack={handleBack} 
        onNext={handleNext}
      >
        <div className="space-y-8">
          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Quién suele comprarte hoy?</label>
             <div className="flex gap-3 mb-4">
               {CLIENT_TYPES.map(type => (
                 <RadioBtn 
                   key={type} 
                   label={type} 
                   selected={formData.clientType === type} 
                   onClick={() => setFormData({...formData, clientType: type})}
                 />
               ))}
             </div>
             
             {/* Dynamic Guided Input */}
             <div className="relative">
               <input 
                 type="text" 
                 className="glass-input w-full p-4 rounded-xl border-primary-500/30 bg-primary-900/5 text-white"
                 placeholder={
                   formData.clientType === 'Negocios' ? "Ej: Negocios que necesitan organizar sus finanzas..." :
                   formData.clientType === 'Ambos' ? "Ej: Personas y empresas buscando eventos..." :
                   "Ej: Personas que quieren recuperar su figura..."
                 }
                 value={formData.clientDefinition}
                 onChange={(e) => setFormData({...formData, clientDefinition: e.target.value})}
               />
               <span className="absolute right-4 top-4 text-xs text-slate-500 pointer-events-none">Editable</span>
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Qué suele preocupar más a tus clientes?</label>
             <div className="grid grid-cols-2 gap-3">
               {CLIENT_WORRIES.map(worry => (
                 <CheckboxBtn 
                   key={worry} 
                   label={worry} 
                   selected={formData.clientPainPoints.includes(worry)} 
                   onClick={() => toggleSelection('clientPainPoints', worry)}
                 />
               ))}
             </div>
          </div>
        </div>
      </StepLayout>
    );
  }

  // BLOCK 4: REAL VALUE
  if (step === 4) {
    return (
      <StepLayout 
        title="No se trata de ser el mejor, sino el más claro" 
        step={4} total={6} 
        onBack={handleBack} 
        onNext={handleNext}
        microCopy="Si no estás seguro, está bien. Lo analizamos por ti."
      >
        <div className="space-y-8">
          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Por qué crees que algunos clientes te eligen?</label>
             <div className="grid grid-cols-2 gap-3">
               {WHY_CHOSEN.map(reason => (
                 <CheckboxBtn 
                   key={reason} 
                   label={reason} 
                   selected={formData.whyChosen.includes(reason)} 
                   onClick={() => toggleSelection('whyChosen', reason)}
                 />
               ))}
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-white font-bold block">👉 (Opcional) ¿Qué tipo de cliente NO disfrutas atender?</label>
             <div className="space-y-2">
               {ANTI_PERSONAS.map(anti => (
                 <CheckboxBtn 
                   key={anti} 
                   label={anti} 
                   selected={formData.antiPersona.includes(anti)} 
                   onClick={() => toggleSelection('antiPersona', anti)}
                 />
               ))}
             </div>
          </div>
        </div>
      </StepLayout>
    );
  }

  // BLOCK 5: GOALS & FRUSTRATIONS
  if (step === 5) {
    return (
      <StepLayout 
        title="¿Qué te gustaría mejorar ahora mismo?" 
        step={5} total={6} 
        onBack={handleBack} 
        onNext={handleNext}
      >
        <div className="space-y-8">
          <div className="space-y-3">
             <label className="text-white font-bold block">👉 Si esto funcionara bien, ¿qué cambiaría?</label>
             <div className="grid grid-cols-2 gap-3">
               {GOALS.map(goal => (
                 <CheckboxBtn 
                   key={goal} 
                   label={goal} 
                   selected={formData.goals.includes(goal)} 
                   onClick={() => toggleSelection('goals', goal)}
                 />
               ))}
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-white font-bold block">👉 ¿Qué es lo que más te frustra hoy del marketing?</label>
             <div className="space-y-2">
               {FRUSTRATIONS.map(frust => (
                 <CheckboxBtn 
                   key={frust} 
                   label={frust} 
                   selected={formData.marketingFrustrations.includes(frust)} 
                   onClick={() => toggleSelection('marketingFrustrations', frust)}
                 />
               ))}
             </div>
          </div>
        </div>
      </StepLayout>
    );
  }

  // BLOCK 6: DIGITAL PRESENCE & CLOSING
  if (step === 6) {
    return (
      <StepLayout 
        title="Déjanos ver tu negocio (opcional)" 
        step={6} total={6} 
        onBack={handleBack} 
        onNext={handleFinalSubmit}
        nextLabel="✨ Crear mi diagnóstico"
        microCopy="Analizamos solo el contenido visible. No tocamos nada."
      >
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 mb-6">
             <p className="text-slate-300 text-sm">
               Esto nos ayuda a darte recomendaciones más precisas. Si no lo tienes todo, no pasa nada.
             </p>
          </div>

          <div className="grid gap-4">
             {['Instagram', 'Facebook', 'TikTok', 'Página web', 'Otro'].map(platform => {
                const key = platform === 'Página web' ? 'website' : platform === 'Otro' ? 'other' : platform.toLowerCase();
                return (
                  <div key={key} className="flex items-center gap-3">
                     <span className="w-24 text-sm text-slate-400 font-bold">{platform}</span>
                     <input 
                       type="text" 
                       placeholder={platform === 'Página web' ? 'www.tuejemplo.com' : '@usuario'}
                       className="glass-input flex-1 p-3 rounded-lg text-sm"
                       value={(formData.links as any)[key]}
                       onChange={(e) => updateLink(key, e.target.value)}
                     />
                  </div>
                )
             })}
          </div>

          {error && (
            <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-200 text-sm flex items-center gap-2 animate-pulse">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
             <p className="text-lg text-white font-medium mb-2">Con esto es suficiente.</p>
             <p className="text-slate-400 text-sm">Ahora déjanos trabajar como lo haría una agencia profesional.</p>
          </div>
        </div>
      </StepLayout>
    );
  }

  // BLOCK 7: LOADING
  if (step === 7) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
         {/* Reuse Loading logic implicitly here or just a simple spinner before App takes over */}
         <div className="text-center space-y-6 animate-pulse">
            <div className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h2 className="text-2xl font-bold text-white">Analizando tu negocio...</h2>
            <p className="text-slate-400">El Director IA está revisando tus respuestas.</p>
         </div>
      </div>
    );
  }

  return null;
};

// --- LAYOUT HELPER ---

const StepLayout: React.FC<{
  title: string;
  children: React.ReactNode;
  step: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  isNextDisabled?: boolean;
  microCopy?: string;
}> = ({ title, children, step, total, onBack, onNext, nextLabel, isNextDisabled, microCopy }) => {
  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-slate-950">
       <div className="w-full max-w-2xl flex-1 flex flex-col justify-center">
          
          {/* Progress */}
          <div className="mb-8 flex items-center gap-3">
             <span className="text-primary-500 font-bold text-sm">Paso {step}/{total}</span>
             <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${(step/total)*100}%` }}></div>
             </div>
          </div>

          {/* Card */}
          <div className="glass-panel p-6 md:p-10 animate-fade-in-blur relative">
             <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-tight">{title}</h2>
             {microCopy && <p className="text-slate-500 text-sm mb-6 font-medium">{microCopy}</p>}
             {!microCopy && <div className="mb-8"></div>}

             <div className="mb-10">
               {children}
             </div>

             <div className="flex items-center justify-between pt-6 border-t border-white/5">
                <button 
                  onClick={onBack} 
                  className="text-slate-500 hover:text-white font-medium text-sm transition-colors px-4 py-2"
                >
                  ← Atrás
                </button>
                <Button 
                  onClick={onNext} 
                  disabled={isNextDisabled}
                  className="px-8 shadow-neon"
                >
                  {nextLabel || 'Siguiente'}
                </Button>
             </div>
          </div>

       </div>
    </div>
  );
};

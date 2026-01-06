
import React, { useState, useEffect } from 'react';
import { UserProfile, Tone } from '../types';
import { Button } from './ui/Button';
import { generateCoreMessage } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

// --- CONSTANTS & OPTIONS (Keeping existing logic) ---
const BUSINESS_AGES = ['Estoy empezando', 'Menos de 1 año', '1–3 años', '3–5 años', 'Más de 5 años'];
const ACQUISITION_CHANNELS = ['Instagram', 'Facebook', 'TikTok', 'WhatsApp', 'Recomendaciones', 'Página web', 'Otro'];
const SALES_FRICTIONS = ['Preguntan precio y desaparecen', 'Preguntan mucho antes de decidir', 'Compran rápido', 'Comparan con otros', 'Aún no recibo muchos mensajes'];
const CLIENT_TYPES = ['Personas', 'Negocios', 'Ambos'];
const CLIENT_WORRIES = ['Falta de tiempo', 'Falta de resultados', 'Confusión', 'Estrés', 'Falta de ventas', 'Otro'];
const WHY_CHOSEN = ['Precio', 'Rapidez', 'Trato personalizado', 'Resultados', 'Experiencia', 'Confianza', 'No estoy seguro'];
const ANTI_PERSONAS = ['Regateadores', 'Impacientes', 'Que no siguen procesos', 'Que no valoran el trabajo', 'Otro'];
const GOALS = ['Más mensajes', 'Más ventas', 'Más claridad', 'Mejor contenido', 'Menos estrés', 'Mejor organización'];
const FRUSTRATIONS = ['No sé qué publicar', 'Publico y no pasa nada', 'No tengo tiempo', 'He probado cosas y no funcionaron', 'No entiendo qué funciona'];

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
      {selected && <Check className="w-3 h-3 text-white" />}
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

// --- ROTATING TEXT COMPONENT FOR WELCOME SCREEN ---
const RotatingText = () => {
  const phrases = [
    "Pensamos por tu negocio.",
    "Ejecutamos contigo.",
    "Crecemos con dirección."
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-10 md:h-12 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg md:text-2xl font-medium bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent"
        >
          {phrases[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0); // 0 = Intro, 1-6 = Blocks, 7 = Loading
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    businessAge: '',
    acquisitionChannels: [] as string[],
    salesFriction: '',
    clientType: '',
    clientDefinition: '',
    clientPainPoints: [] as string[],
    whyChosen: [] as string[],
    antiPersona: [] as string[],
    goals: [] as string[],
    marketingFrustrations: [] as string[],
    links: { instagram: '', facebook: '', tiktok: '', website: '', other: '' }
  });

  const handleNext = () => {
    if (step === 1 && (!formData.businessName || !formData.description)) return;
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

  const handleFinalSubmit = async () => {
    setStep(7); // Loading View
    setIsLoading(true);
    setError(null);

    try {
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
        offering: formData.description,
        ticket: 'Medium ($50-$500)',
        salesProcess: 'Venta Inmediata',
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
        executionCapacity: 'Básico',
        postingFrequency: 'Diaria',
        tone: Tone.PROFESSIONAL,
        isConfigured: true,
        language: 'es',
        coreMessage: coreMessageData.message,
        solvedProblem: formData.clientPainPoints[0] || "Resolver problemas",
      };

      onComplete(fullProfile);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error de conexión con la IA. Verifica tu API Key.");
      setStep(6);
      setIsLoading(false);
    }
  };

  // --- WELCOME SCREEN (STEP 0) REDESIGN ---
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        {/* Animated BG */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.1),transparent_50%)]"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="max-w-[480px] w-full glass-panel p-8 md:p-12 relative z-10 text-center border-t border-white/20 shadow-2xl"
        >
          {/* Logo Glow & Image */}
          <div className="relative mx-auto mb-8 w-auto flex justify-center">
            <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full opacity-50 animate-pulse-slow"></div>
            <img src="/logo-light.png" alt="UpGrowth" className="h-10 w-auto relative z-10" />
          </div>
          
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">Vamos paso a paso.</h1>
          
          <div className="mb-8 h-12 flex items-center justify-center">
             <RotatingText />
          </div>
          
          <div className="space-y-4 mb-10 text-left bg-slate-900/50 p-6 rounded-2xl border border-white/5">
             <div className="flex items-center gap-3 text-slate-300">
               <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                 <Check className="w-3 h-3 text-emerald-400" />
               </div>
               <span className="text-sm font-medium">No necesitas saber marketing</span>
             </div>
             <div className="flex items-center gap-3 text-slate-300">
               <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                 <Check className="w-3 h-3 text-emerald-400" />
               </div>
               <span className="text-sm font-medium">Esto no es un examen, es una conversación</span>
             </div>
             <div className="flex items-center gap-3 text-slate-300">
               <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                 <Check className="w-3 h-3 text-emerald-400" />
               </div>
               <span className="text-sm font-medium">Se adapta a tu negocio</span>
             </div>
          </div>
          
          <button 
            onClick={handleNext}
            className="w-full h-14 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold text-lg shadow-neon hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group"
          >
            Empezar mi dirección
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p className="text-slate-500 text-xs mt-6 leading-relaxed">
            Responde como puedas.<br/>
            <span className="text-slate-400 font-medium">UpGrowth completa los espacios.</span>
          </p>
        </motion.div>
      </div>
    );
  }

  // --- EXISTING STEPS (1-6) WITH MINOR TWEAKS ---
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

  // ... (Steps 2-5 remain identical to existing logic, just wrapping in StepLayout) ...
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
                   selected={formData.salesFriction === fric} 
                   onClick={() => setFormData({...formData, salesFriction: fric})}
                 />
               ))}
             </div>
          </div>
        </div>
      </StepLayout>
    );
  }

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

  // BLOCK 6: CLOSING
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

  if (step === 7) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
         <div className="text-center space-y-6 animate-pulse">
            <div className="relative w-20 h-20 mx-auto">
               <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping"></div>
               <div className="w-20 h-20 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
               <img src="/icon-blue.png" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 opacity-80" alt="loading" />
            </div>
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
          
          <div className="mb-8 flex items-center gap-3">
             <span className="text-primary-500 font-bold text-sm">Paso {step}/{total}</span>
             <div className="h-1 flex-1 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${(step/total)*100}%` }}></div>
             </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-6 md:p-10 relative"
          >
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
          </motion.div>
       </div>
    </div>
  );
};
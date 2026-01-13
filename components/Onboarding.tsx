
import React, { useState, useEffect } from 'react';
import { UserProfile, Tone } from '../types';
import { Button } from './ui/Button';
import { generateCoreMessage } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Save } from 'lucide-react';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onStepSave?: (partialData: any) => Promise<void>;
  initialData?: Partial<UserProfile> | null;
}

// --- CONSTANTS ---
const BUSINESS_AGES = ['Estoy empezando', 'Menos de 1 año', '1–3 años', '3–5 años', 'Más de 5 años'];
const ACQUISITION_CHANNELS = ['Instagram', 'Facebook', 'TikTok', 'WhatsApp', 'Recomendaciones', 'Página web', 'Otro'];
const SALES_FRICTIONS = ['Preguntan precio y desaparecen', 'Preguntan mucho antes de decidir', 'Compran rápido', 'Comparan con otros', 'Aún no recibo muchos mensajes'];
const CLIENT_TYPES = ['Personas', 'Negocios', 'Ambos'];
const CLIENT_WORRIES = ['Falta de tiempo', 'Falta de resultados', 'Confusión', 'Estrés', 'Falta de ventas', 'Otro'];
const WHY_CHOSEN = ['Precio', 'Rapidez', 'Trato personalizado', 'Resultados', 'Experiencia', 'Confianza', 'No estoy seguro'];
const ANTI_PERSONAS = ['Regateadores', 'Impacientes', 'Que no siguen procesos', 'Que no valoran el trabajo', 'Otro'];
const GOALS = ['Más mensajes', 'Más ventas', 'Más claridad', 'Mejor contenido', 'Menos estrés', 'Mejor organización'];
const FRUSTRATIONS = ['No sé qué publicar', 'Publico y no pasa nada', 'No tengo tiempo', 'He probado cosas y no funcionaron', 'No entiendo qué funciona'];

// --- UI COMPONENTS ---
const CheckboxBtn: React.FC<{ selected: boolean; label: string; onClick: () => void }> = ({ selected, label, onClick }) => (
  <button onClick={onClick} className={`w-full p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group ${selected ? 'bg-primary-500/20 border-primary-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-800 hover:border-white/10'}`}>
    <span className="font-medium text-sm md:text-base">{label}</span>
    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selected ? 'bg-primary-500 border-primary-500' : 'border-slate-600 group-hover:border-slate-500'}`}>
      {selected && <Check className="w-3 h-3 text-white" />}
    </div>
  </button>
);

const RadioBtn: React.FC<{ selected: boolean; label: string; onClick: () => void }> = ({ selected, label, onClick }) => (
  <button onClick={onClick} className={`px-4 py-3 rounded-xl border text-center transition-all duration-200 text-sm md:text-base ${selected ? 'bg-primary-500 text-white border-primary-500 shadow-neon font-bold' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'}`}>
    {label}
  </button>
);

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onStepSave, initialData }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default State
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    businessName: '',
    description: '',
    businessAge: '',
    acquisitionChannels: [],
    salesFriction: '',
    clientType: '',
    clientDefinition: '',
    painPoints: [],
    whyChosen: [],
    antiPersona: [],
    goals: [],
    marketingFrustrations: [],
    links: { instagram: '', facebook: '', tiktok: '', website: '' },
    ...initialData // Merge initial data if exists
  });

  // Debounced Autosave effect
  useEffect(() => {
    if (step > 0 && onStepSave) {
      const timer = setTimeout(() => {
        onStepSave(formData);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData, step]);

  const toggleSelection = (field: keyof UserProfile, value: string) => {
    const current = (formData[field] as string[]) || [];
    const updated = current.includes(value) 
      ? current.filter(item => item !== value)
      : [...current, value];
    setFormData({ ...formData, [field]: updated });
  };

  const handleNext = () => {
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setStep(7); // Loading View
    try {
      // Generate Core Message to enrich profile before saving
      const strengthString = formData.whyChosen?.join(', ') || "Servicio de calidad";
      const problemString = formData.painPoints?.join(', ') || "Necesidad general";
      
      let coreMessageData = { message: '' };
      try {
         coreMessageData = await generateCoreMessage(
            formData.businessName!, 
            `${formData.description}. Cliente ideal: ${formData.clientDefinition || formData.clientType}`, 
            strengthString, 
            problemString
        );
      } catch (e) {
          console.warn("Core message gen failed, skipping", e);
      }

      const fullProfile: UserProfile = {
        ...formData as UserProfile,
        offering: formData.description || '',
        ticket: 'Medium ($50-$500)', // Default for MVP
        salesProcess: 'Venta Inmediata', // Default for MVP
        location: 'Online/Local',
        executionCapacity: 'Básico',
        postingFrequency: 'Diaria',
        tone: Tone.PROFESSIONAL,
        isConfigured: true,
        language: 'es',
        coreMessage: coreMessageData.message,
        solvedProblem: formData.painPoints?.[0] || "Resolver problemas",
        keyStrength: strengthString
      };

      onComplete(fullProfile);
    } catch (e: any) {
      console.error(e);
      setError("Error al procesar los datos. Por favor intenta de nuevo.");
      setStep(6);
      setIsLoading(false);
    }
  };

  // --- WELCOME ---
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-[480px] w-full glass-panel p-10 text-center relative z-10 border-t border-white/20">
          <img src="/logo-light.png" alt="UpGrowth" className="h-10 w-auto mx-auto mb-8" />
          <h1 className="text-3xl font-black text-white mb-4">Vamos a darte dirección.</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Responde unas preguntas rápidas. No busques la respuesta perfecta, busca la real. Nosotros nos encargamos de la estrategia.
          </p>
          <button onClick={handleNext} className="w-full h-14 bg-primary-600 text-white rounded-xl font-bold text-lg shadow-neon hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
            {initialData?.businessName ? 'Continuar donde lo dejé' : 'Empezar Diagnóstico'} <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  // --- FORM STEPS ---
  if (step === 1) return (
    <StepLayout title="Lo básico" step={1} total={6} onBack={() => setStep(0)} onNext={handleNext} disabled={!formData.businessName}>
        <div className="space-y-6">
            <div><label className="text-white font-bold block mb-2">Nombre del Negocio</label><input type="text" className="glass-input w-full p-4 rounded-xl" value={formData.businessName} onChange={e => setFormData({...formData, businessName: e.target.value})} autoFocus /></div>
            <div><label className="text-white font-bold block mb-2">¿Qué haces? (Brevemente)</label><textarea className="glass-input w-full p-4 rounded-xl min-h-[100px]" placeholder="Vendo ropa deportiva..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
            <div><label className="text-white font-bold block mb-2">Antigüedad</label><div className="flex flex-wrap gap-2">{BUSINESS_AGES.map(age => <RadioBtn key={age} label={age} selected={formData.businessAge === age} onClick={() => setFormData({...formData, businessAge: age})} />)}</div></div>
        </div>
    </StepLayout>
  );

  if (step === 2) return (
    <StepLayout title="Estado Actual" step={2} total={6} onBack={() => setStep(1)} onNext={handleNext}>
        <div className="space-y-6">
            <div><label className="text-white font-bold block mb-2">Canales de Adquisición</label><div className="grid md:grid-cols-2 gap-3">{ACQUISITION_CHANNELS.map(c => <CheckboxBtn key={c} label={c} selected={formData.acquisitionChannels?.includes(c) || false} onClick={() => toggleSelection('acquisitionChannels', c)} />)}</div></div>
            <div><label className="text-white font-bold block mb-2">Fricción en Ventas</label><div className="space-y-2">{SALES_FRICTIONS.map(f => <RadioBtn key={f} label={f} selected={formData.salesFriction === f} onClick={() => setFormData({...formData, salesFriction: f})} />)}</div></div>
        </div>
    </StepLayout>
  );

  if (step === 3) return (
    <StepLayout title="Tus Clientes" step={3} total={6} onBack={() => setStep(2)} onNext={handleNext}>
        <div className="space-y-6">
             <div><label className="text-white font-bold block mb-2">Tipo de Cliente</label><div className="flex gap-3 mb-3">{CLIENT_TYPES.map(t => <RadioBtn key={t} label={t} selected={formData.clientType === t} onClick={() => setFormData({...formData, clientType: t})} />)}</div>
             <input type="text" className="glass-input w-full p-4 rounded-xl" placeholder="Descríbelos (ej: Madres ocupadas)" value={formData.clientDefinition} onChange={e => setFormData({...formData, clientDefinition: e.target.value})} /></div>
             <div><label className="text-white font-bold block mb-2">¿Qué les duele/preocupa?</label><div className="grid grid-cols-2 gap-3">{CLIENT_WORRIES.map(w => <CheckboxBtn key={w} label={w} selected={formData.painPoints?.includes(w) || false} onClick={() => toggleSelection('painPoints', w)} />)}</div></div>
        </div>
    </StepLayout>
  );

  if (step === 4) return (
    <StepLayout title="Tu Diferenciación" step={4} total={6} onBack={() => setStep(3)} onNext={handleNext}>
        <div className="space-y-6">
            <div><label className="text-white font-bold block mb-2">¿Por qué te eligen?</label><div className="grid grid-cols-2 gap-3">{WHY_CHOSEN.map(w => <CheckboxBtn key={w} label={w} selected={formData.whyChosen?.includes(w) || false} onClick={() => toggleSelection('whyChosen', w)} />)}</div></div>
            <div><label className="text-white font-bold block mb-2">¿A quién NO quieres venderle?</label><div className="space-y-2">{ANTI_PERSONAS.map(a => <CheckboxBtn key={a} label={a} selected={formData.antiPersona?.includes(a) || false} onClick={() => toggleSelection('antiPersona', a)} />)}</div></div>
        </div>
    </StepLayout>
  );

  if (step === 5) return (
    <StepLayout title="Objetivos" step={5} total={6} onBack={() => setStep(4)} onNext={handleNext}>
        <div className="space-y-6">
            <div><label className="text-white font-bold block mb-2">Objetivos a Corto Plazo</label><div className="grid grid-cols-2 gap-3">{GOALS.map(g => <CheckboxBtn key={g} label={g} selected={(formData.goals as string[])?.includes(g) || false} onClick={() => toggleSelection('goals', g as any)} />)}</div></div>
            <div><label className="text-white font-bold block mb-2">Frustraciones con Marketing</label><div className="space-y-2">{FRUSTRATIONS.map(f => <CheckboxBtn key={f} label={f} selected={formData.marketingFrustrations?.includes(f) || false} onClick={() => toggleSelection('marketingFrustrations', f)} />)}</div></div>
        </div>
    </StepLayout>
  );

  if (step === 6) return (
    <StepLayout title="Redes y Cierre" step={6} total={6} onBack={() => setStep(5)} onNext={handleFinalSubmit} nextLabel="Finalizar Diagnóstico">
        <div className="space-y-4">
             {['Instagram', 'Facebook', 'TikTok', 'Website'].map(net => {
                 const key = net.toLowerCase() as keyof typeof formData.links;
                 return (
                    <div key={net} className="flex items-center gap-3">
                        <span className="w-24 text-sm font-bold text-slate-400">{net}</span>
                        <input type="text" className="glass-input flex-1 p-3 rounded-lg text-sm" placeholder={net === 'Website' ? 'www...' : '@usuario'} value={formData.links?.[key]} onChange={e => setFormData({...formData, links: { ...formData.links!, [key]: e.target.value }})} />
                    </div>
                 )
             })}
             {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-500/30">{error}</div>}
        </div>
    </StepLayout>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="animate-pulse">Procesando perfil...</div>
    </div>
  );
};

const StepLayout: React.FC<{ title: string; children: React.ReactNode; step: number; total: number; onBack: () => void; onNext: () => void; disabled?: boolean; nextLabel?: string }> = ({ title, children, step, total, onBack, onNext, disabled, nextLabel }) => (
    <div className="min-h-screen flex flex-col items-center p-4 bg-slate-950">
        <div className="w-full max-w-2xl mt-10">
            <div className="flex items-center gap-4 mb-8">
                <span className="text-primary-500 font-bold">Paso {step}/{total}</span>
                <div className="h-2 flex-1 bg-slate-900 rounded-full"><div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{width: `${(step/total)*100}%`}}></div></div>
            </div>
            <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="glass-panel p-8">
                <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
                {children}
                <div className="flex justify-between mt-8 pt-6 border-t border-white/5">
                    <button onClick={onBack} className="text-slate-500 hover:text-white px-4">Atrás</button>
                    <Button onClick={onNext} disabled={disabled}>{nextLabel || 'Siguiente'}</Button>
                </div>
            </motion.div>
        </div>
    </div>
);

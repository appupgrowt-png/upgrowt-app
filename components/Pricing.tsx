import React from 'react';
import { Button } from './ui/Button';

interface PricingProps {
  onBack: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 animate-fade-in">
       <div className="max-w-5xl mx-auto">
          <button onClick={onBack} className="text-slate-500 hover:text-white mb-8 flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
            ← Volver al Dashboard
          </button>

          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Invierte en Dirección, no en Intentos</h2>
             <p className="text-slate-400 max-w-2xl mx-auto">No ejecutamos por ti. Te decimos exactamente qué hacer, cuándo y por qué, para que dejes de improvisar.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
             {/* Plan Base */}
             <div className="glass-panel p-8 border-white/5 flex flex-col">
                <div className="mb-8">
                   <h3 className="text-xl font-bold text-white mb-2">Plan Base</h3>
                   <p className="text-slate-400 text-sm h-10">Dirección estratégica clara para dueños que ejecutan solos.</p>
                </div>
                <div className="text-4xl font-bold text-white mb-8">$49<span className="text-lg text-slate-500 font-normal">/mes</span></div>
                
                <ul className="space-y-4 mb-8 flex-1">
                   {['Diagnóstico de negocio completo', '1 Prioridad estratégica activa', 'Dashboard directivo', 'Ritual de enfoque semanal', 'Consultor IA (Limitado)'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                         <span className="text-primary-500">✓</span> {item}
                      </li>
                   ))}
                </ul>
                <Button variant="secondary" className="w-full">Seleccionar Base</Button>
             </div>

             {/* Plan Pro */}
             <div className="glass-panel p-8 border-primary-500/30 bg-primary-900/10 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary-500 text-white text-[10px] font-bold uppercase px-3 py-1">Recomendado</div>
                <div className="mb-8">
                   <h3 className="text-xl font-bold text-white mb-2">Plan Pro</h3>
                   <p className="text-primary-200/70 text-sm h-10">Ejecución guiada y soporte profundo para crecer más rápido.</p>
                </div>
                <div className="text-4xl font-bold text-white mb-8">$99<span className="text-lg text-slate-500 font-normal">/mes</span></div>
                
                <ul className="space-y-4 mb-8 flex-1">
                   {['Todo lo del Plan Base', 'Guías de ejecución paso a paso', 'Acceso ilimitado al Consultor IA', 'Roadmaps trimestrales', 'Auditoría mensual de progreso'].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-white text-sm font-medium">
                         <span className="text-emerald-400">✓</span> {item}
                      </li>
                   ))}
                </ul>
                <Button className="w-full">Seleccionar Pro</Button>
             </div>
          </div>
       </div>
    </div>
  );
};
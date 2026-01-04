import React, { useState } from 'react';
import { Button } from './ui/Button';
import { t } from '../utils/i18n';
import { Language } from '../types';

interface WeeklyCheckinProps {
  isOpen: boolean;
  onClose: () => void;
  currentPriority: string;
  lang: Language;
}

export const WeeklyCheckin: React.FC<WeeklyCheckinProps> = ({ isOpen, onClose, currentPriority, lang }) => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<any>({});

  if (!isOpen) return null;

  const handleSelect = (key: string, value: string) => {
    setAnswers({ ...answers, [key]: value });
    if (step < 4) setStep(step + 1);
  };

  const renderContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">{t('checkin_title', lang)}</h3>
              <p className="text-slate-400 text-sm font-medium">{t('checkin_subtitle', lang)}</p>
            </div>
            
            <div className="space-y-3">
              <button onClick={() => handleSelect('completed', 'yes')} className="w-full p-5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-emerald-900/20 hover:border-emerald-500 transition-all text-left group">
                <span className="block font-bold text-white group-hover:text-emerald-400">{t('checkin_opt_1', lang)}</span>
              </button>
              <button onClick={() => handleSelect('completed', 'partially')} className="w-full p-5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-yellow-900/20 hover:border-yellow-500 transition-all text-left group">
                 <span className="block font-bold text-white group-hover:text-yellow-400">{t('checkin_opt_2', lang)}</span>
              </button>
              <button onClick={() => handleSelect('completed', 'no')} className="w-full p-5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-primary-900/20 hover:border-primary-500 transition-all text-left group">
                 <span className="block font-bold text-white group-hover:text-primary-400">{t('checkin_opt_3', lang)}</span>
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">¿Qué fue lo más difícil?</h3>
            <div className="grid grid-cols-2 gap-3">
              {['Falta de tiempo', 'No supe cómo hacerlo', 'Miedo a publicar', 'Tecnología', 'Me distraje', 'Nada, fue fácil'].map(opt => (
                <button key={opt} onClick={() => handleSelect('difficulty', opt)} className="p-3 rounded-lg border border-slate-700 bg-slate-900 hover:border-white/30 text-xs text-left">
                  {opt}
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Nivel de Enfoque (1-10)</h3>
            <p className="text-slate-400 text-sm">¿Te mantuviste en la estrategia o improvisaste?</p>
            <div className="flex justify-between gap-2">
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                 <button key={num} onClick={() => handleSelect('focus', num.toString())} className="w-8 h-10 rounded bg-slate-800 border border-slate-700 hover:bg-primary-500 hover:text-white transition-colors">
                   {num}
                 </button>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
           <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto text-2xl shadow-neon">
                🔄
              </div>
              <h3 className="text-2xl font-bold text-white">Ritual Completado</h3>
              <p className="text-slate-300">
                Gracias por la honestidad. No necesitas cambiar la estrategia completa. 
                {answers.completed === 'yes' ? ' Mantén este ritmo.' : ' Ajusta tus tiempos y vuelve a intentarlo.'}
              </p>
              <Button onClick={onClose} className="w-full">Volver al Dashboard</Button>
           </div>
        );
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel max-w-md w-full p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
        <div className="mb-6">
           <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest">Ritual Semanal</span>
           <div className="h-1 w-full bg-slate-800 mt-2 rounded-full overflow-hidden">
             <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${step * 25}%` }}></div>
           </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};
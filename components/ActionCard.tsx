import React, { useState } from 'react';
import { DailyAction, ActionType } from '../types';
import { Button } from './ui/Button';

interface ActionCardProps {
  action: DailyAction;
  onComplete: () => void;
}

const ActionTypeIcon: React.FC<{ type: ActionType }> = ({ type }) => {
  // Using neon colors for dark mode
  switch (type) {
    case ActionType.REEL:
      return (
        <span className="p-2.5 rounded-lg bg-pink-500/10 text-pink-400 ring-1 ring-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
        </span>
      );
    case ActionType.STORY:
      return (
        <span className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </span>
      );
    case ActionType.EMAIL:
      return (
        <span className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </span>
      );
    default:
      return (
         <span className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
         </span>
      );
  }
}

export const ActionCard: React.FC<ActionCardProps> = ({ action, onComplete }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(action.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel w-full max-w-2xl mx-auto overflow-hidden animate-fade-in-up border-primary-500/20">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <ActionTypeIcon type={action.type} />
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{action.type}</span>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300">
            ⏱ {action.timeRequired}
          </span>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight mb-2 tracking-tight">
          {action.title}
        </h2>
        <p className="text-slate-400 font-light">{action.objective}</p>
      </div>

      {/* Content Body */}
      <div className="p-6 md:p-8 space-y-8">
        
        {/* Instructions */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-primary-400 uppercase tracking-widest">Instrucciones Tácticas</h3>
          <p className="text-lg text-slate-200 leading-relaxed font-light">
            {action.instructions}
          </p>
        </div>

        {/* Script Box */}
        <div className="bg-black/30 rounded-xl p-6 border border-white/10 relative group hover:border-primary-500/30 transition-colors">
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleCopy}
              className="text-xs font-bold bg-primary-600 text-white px-3 py-1.5 rounded hover:bg-primary-500 shadow-neon"
            >
              {copied ? '¡Copiado!' : 'COPIAR'}
            </button>
          </div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Guion Sugerido</h3>
          <p className="font-medium text-white/90 whitespace-pre-line italic text-lg font-serif">
            "{action.script}"
          </p>
          <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Llamada a la Acción (CTA)</span>
              <p className="text-sm text-primary-300 font-semibold mt-1">{action.cta}</p>
            </div>
          </div>
        </div>

        {/* Tip */}
        <div className="flex items-start space-x-4 p-5 bg-gradient-to-r from-primary-900/10 to-transparent rounded-lg border-l-2 border-primary-500">
          <span className="text-2xl mt-[-2px]">💡</span>
          <div>
            <h4 className="text-sm font-bold text-white mb-1">Consultant Tip</h4>
            <p className="text-sm text-slate-400 leading-relaxed">{action.tip}</p>
          </div>
        </div>

      </div>

      {/* Footer Actions */}
      <div className="p-6 md:p-8 bg-black/20 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="text-xs text-slate-500 font-medium uppercase tracking-widest">
          Impacto Estimado: <span className="text-white ml-1">{action.impactEstimate}</span>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Button variant="secondary" onClick={handleCopy} className="flex-1 sm:flex-none">
            Copiar Guion
          </Button>
          <Button onClick={onComplete} className="flex-1 sm:flex-none">
            ✅ Marcar Hecho
          </Button>
        </div>
      </div>
    </div>
  );
};
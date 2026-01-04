
import React, { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { t } from '../utils/i18n';
import { Language } from '../types';

interface CompletionSuccessProps {
  onNext: () => void;
  lang?: Language;
}

export const CompletionSuccess: React.FC<CompletionSuccessProps> = ({ onNext, lang = 'es' as Language }) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Initial delay for animation
    setTimeout(() => setShowContent(true), 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
       {/* Background Burst Animation */}
       <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 rounded-full bg-emerald-500/20 blur-[100px] transition-all duration-1000 ease-out ${showContent ? 'w-[800px] h-[800px]' : ''}`}></div>

       <div className={`max-w-2xl w-full text-center space-y-8 relative z-10 transition-all duration-700 transform ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          
          {/* Animated Icon */}
          <div className="relative w-24 h-24 mx-auto mb-8">
             <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
             <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
               <svg className={`w-12 h-12 text-white transition-all duration-500 delay-300 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
               </svg>
             </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white leading-tight">
            {t('priority_done', lang)}
          </h1>

          <div className="glass-panel p-8 text-center space-y-4 border-emerald-500/20 shadow-neon">
             <p className="text-white text-lg font-medium leading-relaxed">
               {t('agency_handover', lang)}
             </p>
          </div>

          {/* New Level Unlock Animation if applicable (simulated here) */}
          <div className="pt-8 animate-fade-in delay-1000">
             <div className="inline-block px-4 py-2 rounded-lg bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm font-bold uppercase tracking-widest mb-6 animate-pulse">
               🚀 {t('agency_mode', lang)}
             </div>
             
             <div>
               <Button onClick={onNext} className="mx-auto w-full md:w-auto px-12 py-5 text-lg shadow-neon">
                 {t('enter_weekly', lang)} →
               </Button>
             </div>
          </div>

       </div>
    </div>
  );
};

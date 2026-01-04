
import React from 'react';
import { RoadmapPhase, Language, UserProfile } from '../types';
import { Button } from './ui/Button';
import { t } from '../utils/i18n';

interface RoadmapViewProps {
  phases: RoadmapPhase[];
  profile: UserProfile;
  lang: Language;
  onStartPriority: () => void;
}

export const RoadmapView: React.FC<RoadmapViewProps> = ({ phases, profile, lang, onStartPriority }) => {
  return (
    <div className="min-h-screen p-6 md:p-12 bg-slate-950 flex flex-col items-center animate-fade-in">
       
       <div className="max-w-5xl w-full">
          
          {/* Header */}
          <div className="mb-16 text-center">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></span>
                {t('director_view', lang)}
             </div>
             <h1 className="text-3xl md:text-5xl font-black text-white mb-6">
                {t('roadmap_title', lang)}: <span className="text-primary-400">{profile.businessName}</span>
             </h1>
             <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                {t('roadmap_desc', lang)}
             </p>
          </div>

          {/* Timeline Container */}
          <div className="relative space-y-8">
             {/* Vertical Line */}
             <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-500 via-slate-800 to-transparent z-0 transform -translate-x-1/2"></div>

             {phases.map((phase, index) => {
               const isActive = phase.status === 'active';
               const isCompleted = phase.status === 'completed';
               const isLocked = phase.status === 'locked';

               return (
                 <div key={index} className={`relative z-10 flex flex-col md:flex-row gap-8 items-center ${index % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                    
                    {/* Content Card */}
                    <div className={`flex-1 w-full md:w-auto ${index % 2 !== 0 ? 'md:text-left' : 'md:text-right'}`}>
                       <div className={`glass-panel p-6 md:p-8 transition-all duration-500 ${
                          isActive 
                            ? 'border-primary-500/50 bg-primary-900/10 shadow-[0_0_30px_rgba(6,182,212,0.1)] scale-105' 
                            : isLocked 
                              ? 'opacity-60 grayscale border-white/5 bg-slate-950' 
                              : 'border-emerald-500/30 bg-emerald-900/5'
                       }`}>
                          <div className={`flex flex-col gap-2 ${index % 2 !== 0 ? '' : 'md:items-end'}`}>
                             <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded w-fit ${
                                isActive ? 'bg-primary-500 text-white' : isLocked ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500 text-white'
                             }`}>
                                {t('phase', lang)} {index + 1}
                             </span>
                             <h3 className="text-xl md:text-2xl font-bold text-white mb-2">{phase.phaseName}</h3>
                             <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                               {phase.objective}
                             </p>
                             
                             <div className={`grid grid-cols-2 gap-4 w-full mt-4 border-t border-white/5 pt-4 ${isLocked ? 'opacity-50' : ''}`}>
                                <div>
                                   <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{t('duration', lang)}</span>
                                   <span className="text-white font-medium text-sm">{phase.duration}</span>
                                </div>
                                <div>
                                   <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">{t('outcome', lang)}</span>
                                   <span className="text-white font-medium text-sm leading-tight">{phase.expectedOutcome}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Central Node */}
                    <div className="w-12 h-12 flex-shrink-0 rounded-full border-4 bg-slate-950 flex items-center justify-center relative z-20 transition-all duration-500 shadow-xl
                        ${isActive ? 'border-primary-500 scale-125' : isLocked ? 'border-slate-700' : 'border-emerald-500'}">
                       {isActive && <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping"></div>}
                       <span className="text-lg">
                          {isCompleted ? '✓' : isActive ? '🚀' : '🔒'}
                       </span>
                    </div>

                    {/* Spacer for alignment */}
                    <div className="flex-1 hidden md:block"></div>
                 </div>
               )
             })}
          </div>

          {/* Footer CTA */}
          <div className="mt-20 text-center animate-fade-in-up">
             <div className="inline-block relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-emerald-600 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-500"></div>
                <Button onClick={onStartPriority} className="relative text-lg px-12 py-5 shadow-2xl">
                  {t('start_priority', lang)}
                </Button>
             </div>
             <p className="text-slate-400 mt-6 text-sm font-medium">
               {t('priority_sub', lang)}
             </p>
          </div>

       </div>
    </div>
  );
};

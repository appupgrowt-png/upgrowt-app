
import React, { useState } from 'react';
import { WeeklyAgencyPlan, UserProfile, Language, WeeklyAgencyTask } from '../types';
import { Button } from './ui/Button';
import { t } from '../utils/i18n';
import { TacticalDeck } from './DashboardSections';
import { AIConsultant } from './AIConsultant';

interface WeeklyAgencyDashboardProps {
  plan: WeeklyAgencyPlan;
  profile: UserProfile;
  lang: Language;
  onUpdateTask: (dayIndex: number, isCompleted: boolean) => void;
  // Passing strategy for context if needed for other components
  strategy: any; 
}

const DailyTaskCard: React.FC<{ 
  task: WeeklyAgencyTask; 
  index: number; 
  onToggle: () => void; 
  lang: Language 
}> = ({ task, index, onToggle, lang }) => {
  return (
    <div className={`glass-panel p-6 border-white/5 transition-all duration-300 relative overflow-hidden group ${task.isCompleted ? 'opacity-60 grayscale' : 'hover:border-primary-500/30'}`}>
       
       <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-1 rounded">
            {task.day}
          </span>
          {task.contentIdea && (
            <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest border border-pink-500/20 px-2 py-1 rounded-full bg-pink-500/5">
              {t('content_cue', lang)}
            </span>
          )}
       </div>

       <h3 className="text-lg font-bold text-white mb-2 leading-tight">
         {task.actionTitle}
       </h3>
       
       <p className="text-slate-400 text-sm mb-6 leading-relaxed">
         {task.instruction}
       </p>

       {task.contentIdea && (
         <div className="mb-6 bg-slate-900/50 p-4 rounded-lg border border-white/5">
            <div className="flex gap-4 mb-2">
               <div>
                 <span className="text-[10px] text-slate-500 uppercase block">{t('platform', lang)}</span>
                 <span className="text-xs text-white font-bold">{task.contentIdea.platform}</span>
               </div>
               <div>
                 <span className="text-[10px] text-slate-500 uppercase block">{t('objective', lang)}</span>
                 <span className="text-xs text-white font-bold">{task.contentIdea.desiredResult}</span>
               </div>
            </div>
            <p className="text-sm text-slate-300 italic border-l-2 border-pink-500 pl-3">
              "{task.contentIdea.whatToPost}"
            </p>
         </div>
       )}

       <div className="mt-auto pt-4 border-t border-white/5">
          <button 
            onClick={onToggle}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              task.isCompleted 
                ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-500/20' 
                : 'bg-white/5 text-white hover:bg-primary-600 hover:shadow-neon'
            }`}
          >
            {task.isCompleted ? '✓ Completado' : t('mark_done', lang)}
          </button>
       </div>
    </div>
  );
};

export const WeeklyAgencyDashboard: React.FC<WeeklyAgencyDashboardProps> = ({ 
  plan, 
  profile, 
  lang,
  onUpdateTask,
  strategy
}) => {
  const [isConsultantOpen, setIsConsultantOpen] = useState(false);

  // Calculate progress
  const completedTasks = plan.dailyPlan.filter(t => t.isCompleted).length;
  const totalTasks = plan.dailyPlan.length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1800px] mx-auto space-y-8 animate-fade-in pb-20 px-4 md:px-6">
      
      {/* HEADER: AGENCY STATUS */}
      <div className="flex flex-col md:flex-row justify-between items-end pb-6 border-b border-white/5 gap-4">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{t('agency_mode', lang)} • {t('week_label', lang)} {plan.weekNumber}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">
               {profile.businessName} Command Center
            </h1>
         </div>
         <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-xl border border-white/5">
            <span className="text-xs text-slate-400 font-bold px-2">Progreso Semanal</span>
            <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="text-xs text-white font-bold px-2">{progress}%</span>
         </div>
      </div>

      {/* HERO: WEEKLY PRIORITY (THE ONE THING) */}
      <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-primary-500/20 shadow-neon">
         <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary-900/20 to-transparent pointer-events-none"></div>
         <div className="p-8 relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
               <span className="inline-block px-3 py-1 rounded bg-primary-500 text-white text-[10px] font-bold uppercase tracking-widest">
                 {t('priority_label', lang)}
               </span>
               <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
                 {plan.weeklyPriority.title}
               </h2>
               <p className="text-slate-400 text-lg max-w-2xl">
                 {plan.weeklyPriority.whyNow}
               </p>
            </div>
            <div className="w-full md:w-64 bg-black/40 p-6 rounded-xl border border-white/10 backdrop-blur-sm">
               <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-2">{t('impact_label', lang)}</span>
               <p className="text-emerald-400 font-bold leading-snug">
                 {plan.weeklyPriority.businessImpact}
               </p>
            </div>
         </div>
      </div>

      {/* DAILY EXECUTION GRID */}
      <div>
         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
           {t('daily_plan', lang)} <span className="h-px flex-1 bg-white/10 ml-2"></span>
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {plan.dailyPlan.map((task, idx) => (
               <DailyTaskCard 
                 key={idx} 
                 task={task} 
                 index={idx} 
                 lang={lang}
                 onToggle={() => onUpdateTask(idx, !task.isCompleted)} 
               />
            ))}
         </div>
      </div>

      {/* TACTICAL TOOLS (Simplified for Agency Mode) */}
      <div className="pt-8 border-t border-white/5">
         <TacticalDeck 
           video={strategy.video} 
           copy={strategy.staticCopy} 
           trends={strategy.trends}
           lang={lang}
           profile={profile}
         />
      </div>

      {/* Consultant Float */}
      <button 
        onClick={() => setIsConsultantOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary-600 hover:bg-primary-500 text-white p-4 rounded-full shadow-neon transition-transform hover:scale-110 flex items-center justify-center"
      >
        <span className="text-2xl">🤖</span>
      </button>

      <AIConsultant 
        isOpen={isConsultantOpen} 
        onClose={() => setIsConsultantOpen(false)} 
        profile={profile}
        strategy={strategy}
      />

    </div>
  );
};

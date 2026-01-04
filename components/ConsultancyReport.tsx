
import React from 'react';
import { UserProfile, BusinessAudit } from '../types';
import { Button } from './ui/Button';
import { t } from '../utils/i18n';

interface ReportProps {
  profile: UserProfile;
  auditData: BusinessAudit;
  onContinue: () => void;
  isLoadingPlan?: boolean; // New prop to indicate if background plan is still running
}

export const ConsultancyReport: React.FC<ReportProps> = ({ profile, auditData, onContinue, isLoadingPlan }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="glass-panel max-w-4xl w-full p-8 md:p-12 relative overflow-hidden animate-fade-in-up border-t border-white/10 shadow-2xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-8 mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-8 bg-primary-500 rounded-sm"></span>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Diagnóstico Ejecutivo</h1>
            </div>
            <p className="text-slate-400 ml-5 text-sm uppercase tracking-widest">
              Preparado para: <span className="text-white font-bold">{profile.businessName}</span>
            </p>
          </div>
          <div className="flex flex-col items-end">
             <span className="px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest">
               Confidencial
             </span>
             <span className="text-[10px] text-slate-600 mt-2">Consultoría Senior AI</span>
          </div>
        </div>

        {/* 1. Resumen Ejecutivo */}
        <div className="mb-10">
          <h3 className="text-xs text-primary-400 uppercase font-bold tracking-[0.2em] mb-4">01. Resumen Ejecutivo</h3>
          <p className="text-lg md:text-xl text-slate-200 leading-relaxed font-light border-l-2 border-primary-500/30 pl-6">
            {auditData.executiveSummary}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          
          {/* 2 & 3. Problema y Causa */}
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 md:p-8">
            <div className="mb-6">
              <h3 className="text-xs text-red-400 uppercase font-bold tracking-[0.2em] mb-2 flex items-center gap-2">
                02. Problema Principal <span className="text-red-500 text-lg">⚠️</span>
              </h3>
              <p className="text-white font-medium text-lg">{auditData.mainProblem}</p>
            </div>
            <div>
              <h3 className="text-xs text-red-400/70 uppercase font-bold tracking-[0.2em] mb-2">
                03. Causa Raíz
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">{auditData.rootCause}</p>
            </div>
          </div>

          {/* 6. Oportunidad */}
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 md:p-8 flex flex-col justify-center">
             <h3 className="text-xs text-emerald-400 uppercase font-bold tracking-[0.2em] mb-3 flex items-center gap-2">
                06. Mayor Oportunidad <span className="text-emerald-500 text-lg">🚀</span>
             </h3>
             <p className="text-white font-medium text-lg leading-relaxed">
               {auditData.growthOpportunity}
             </p>
          </div>
        </div>

        {/* 4 & 5. Fortalezas y Factores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-10 border-t border-white/5 pt-10">
           <div>
              <h3 className="text-xs text-slate-500 uppercase font-bold tracking-[0.2em] mb-4">04. Fortalezas Actuales</h3>
              <ul className="space-y-3">
                {auditData.strengths.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2"></div>
                    <span className="text-slate-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
           </div>
           <div>
              <h3 className="text-xs text-slate-500 uppercase font-bold tracking-[0.2em] mb-4">05. Factores Limitantes</h3>
              <ul className="space-y-3">
                {auditData.limitingFactors.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2"></div>
                    <span className="text-slate-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
           </div>
        </div>

        {/* 7 & 8. Plan y Qué NO hacer */}
        <div className="bg-slate-900/50 rounded-2xl p-8 border border-white/5 mb-10">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div>
                <h3 className="text-xs text-primary-400 uppercase font-bold tracking-[0.2em] mb-4">07. Plan Prioritario</h3>
                <div className="space-y-4">
                  {auditData.priorityPlan.map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <span className="text-primary-500 font-bold text-lg font-mono">0{i+1}</span>
                      <p className="text-white font-medium text-sm pt-1">{item}</p>
                    </div>
                  ))}
                </div>
             </div>
             <div>
                <h3 className="text-xs text-orange-400 uppercase font-bold tracking-[0.2em] mb-4">08. Qué NO hacer ahora</h3>
                <div className="space-y-3 bg-orange-500/5 p-4 rounded-xl border border-orange-500/10">
                  {auditData.whatNotToDo.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                       <span className="text-orange-500 text-xs mt-1">✕</span>
                       <p className="text-slate-300 text-sm italic">{item}</p>
                    </div>
                  ))}
                </div>
             </div>
           </div>
        </div>

        {/* 9. Cierre */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h3 className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Conclusión Estratégica</h3>
          <p className="text-slate-300 font-medium italic">"{auditData.strategicClosing}"</p>
        </div>

        <div className="pt-6 border-t border-white/10">
            <Button onClick={onContinue} className="w-full text-lg h-16 shadow-neon group" isLoading={isLoadingPlan}>
              {isLoadingPlan ? (
                 <span>Creando plan táctico...</span>
              ) : (
                <>
                   <span className="group-hover:mr-2 transition-all">{t('view_roadmap', profile.language || 'es')} {profile.businessName}</span>
                   <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </>
              )}
            </Button>
            <p className="text-center text-slate-600 text-xs mt-4">
              {isLoadingPlan ? "La IA está diseñando tu plan paso a paso." : "Al hacer clic, revelaremos el mapa completo de crecimiento."}
            </p>
        </div>

      </div>
    </div>
  );
};

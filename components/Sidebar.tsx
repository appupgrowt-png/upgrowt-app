import React from 'react';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface SidebarProps {
  onLogout: () => void;
  onSettings: () => void;
  activeView?: string;
  onNavigate?: (action: string) => void;
  lang: Language;
  currentPhaseIndex?: number; // 0: Fundamentos, 1: Conversion, etc.
}

const MenuButton: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean;
  locked?: boolean;
  onClick?: () => void;
  lang: Language;
}> = ({ icon, label, active, locked, onClick, lang }) => (
  <button 
    onClick={locked ? undefined : onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
      locked 
        ? 'opacity-50 cursor-not-allowed hover:bg-transparent' 
        : active 
          ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
    }`}
  >
    <div className={`${active ? 'text-primary-400' : locked ? 'text-slate-600' : 'text-slate-500 group-hover:text-white'}`}>
      {icon}
    </div>
    <span className={`font-medium text-sm ${active ? 'font-bold' : ''}`}>{label}</span>
    
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shadow-[0_0_8px_#22d3ee]"></div>}
    
    {locked && (
      <div className="ml-auto">
        <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
    )}

    {/* Hover Tooltip for Locked Items */}
    {locked && (
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 w-48 bg-slate-800 text-xs text-slate-300 p-3 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl backdrop-blur-md">
        {t('locked_tooltip', lang)}
      </div>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ onLogout, onSettings, activeView = 'dashboard', onNavigate, lang, currentPhaseIndex = 0 }) => {
  
  // Logic: 
  // Phase 0: Fundamentos (Only Dashboard, Roadmap, Action Plan)
  // Phase 1: Conversion (Same)
  // Phase 2: Contenidos (Unlocks Content & Trends)
  // Phase 3: Scaling
  
  // Note: Array index 0 is Phase 1, Index 1 is Phase 2, Index 2 is Phase 3.
  const isContentUnlocked = currentPhaseIndex >= 2; 

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-[#020617]/95 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 hidden md:flex">
      {/* Brand */}
      <div className="h-24 flex flex-col justify-center px-6 border-b border-white/5 relative overflow-hidden">
        {/* Subtle glow behind logo */}
        <div className="absolute top-0 left-0 w-32 h-24 bg-primary-500/5 blur-xl"></div>
        
        <div className="relative z-10">
          <img 
            src="/logo-light.png" 
            alt="UpGrowth" 
            className="h-8 w-auto object-contain mb-1" 
          />
          <p className="text-[10px] text-primary-400 font-bold tracking-[0.2em] uppercase pl-1 opacity-80">
            AI Marketing Director
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="flex-1 py-8 px-4 space-y-1 overflow-y-auto overflow-x-hidden">
        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-4 mb-2">{t('direction', lang)}</div>
        
        <MenuButton 
          active={activeView === 'dashboard'}
          label={t('dashboard', lang)} 
          onClick={() => onNavigate?.('hero')}
          lang={lang}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} 
        />
        
        <MenuButton 
          label={t('roadmap', lang)} 
          onClick={() => onNavigate?.('roadmap')}
          lang={lang}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>} 
        />

        <MenuButton 
          label={t('action_plan', lang)} 
          onClick={() => onNavigate?.('hero')}
          lang={lang}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} 
        />

        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-4 mb-2 mt-6">{t('execution', lang)}</div>

        <MenuButton 
          label={t('content', lang)} 
          onClick={() => onNavigate?.('content')}
          locked={!isContentUnlocked}
          lang={lang}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>} 
        />

        <MenuButton 
          label={t('trends', lang)} 
          onClick={() => onNavigate?.('trends')}
          locked={!isContentUnlocked}
          lang={lang}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} 
        />

        {/* AI Consultant Float */}
        <div className="mt-8 px-4">
           <div 
             className="bg-gradient-to-b from-primary-900/20 to-slate-900 border border-primary-500/20 rounded-xl p-4 relative overflow-hidden group cursor-pointer hover:border-primary-500/40 transition-all"
             onClick={() => onNavigate?.('consultant')}
           >
              <div className="absolute top-0 left-0 w-full h-1 bg-primary-500"></div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                   <span className="text-lg">🤖</span>
                 </div>
                 <div>
                    <span className="text-xs font-bold text-white block">{t('consultant', lang)}</span>
                    <span className="text-xs text-primary-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Online
                    </span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 space-y-1">
        <MenuButton 
          label={t('settings', lang)} 
          onClick={onSettings}
          lang={lang}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} 
        />
        <MenuButton 
          label={t('logout', lang)} 
          onClick={onLogout}
          lang={lang}
          icon={<svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} 
        />
      </div>
    </div>
  );
};
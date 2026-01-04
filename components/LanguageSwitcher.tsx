import React from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  currentLang: Language;
  onToggle: (lang: Language) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ currentLang, onToggle }) => {
  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="flex bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-glass">
        <button
          onClick={() => onToggle('es')}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 ${
            currentLang === 'es'
              ? 'bg-primary-500 text-white shadow-neon'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          ES
        </button>
        <button
          onClick={() => onToggle('en')}
          className={`px-3 py-1 text-xs font-bold rounded-full transition-all duration-300 ${
            currentLang === 'en'
              ? 'bg-primary-500 text-white shadow-neon'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          EN
        </button>
      </div>
    </div>
  );
};
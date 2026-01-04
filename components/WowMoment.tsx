
import React, { useEffect, useState } from 'react';
import { PriorityFocus } from '../types';
import { Button } from './ui/Button';

interface WowMomentProps {
  focus: PriorityFocus;
  onContinue: () => void;
}

export const WowMoment: React.FC<WowMomentProps> = ({ focus, onContinue }) => {
  const [phase, setPhase] = useState(0); 
  // 0: Init
  // 1: Type first part
  // 2: Show Gradient Word
  // 3: Type second part
  // 4: Show Subtitle
  // 5: Show Card
  // 6: Show Button (10s)

  // Typography state
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  
  const fullText1 = "Este es el ";
  const fullText2 = " más importante que debes hacer ahora.";

  useEffect(() => {
    // TIMELINE ORCHESTRATION
    
    // 1. Start Typing First part
    let currentText1 = '';
    const type1 = setInterval(() => {
      if (currentText1.length < fullText1.length) {
        currentText1 = fullText1.slice(0, currentText1.length + 1);
        setText1(currentText1);
      } else {
        clearInterval(type1);
        setPhase(2); // Reveal "Movimiento"
      }
    }, 50);

    // 2. Trigger rest of sequence based on delays
    const seq2 = setTimeout(() => {
       setPhase(3); // Start typing part 2
       let currentText2 = '';
       const type2 = setInterval(() => {
         if (currentText2.length < fullText2.length) {
            currentText2 = fullText2.slice(0, currentText2.length + 1);
            setText2(currentText2);
         } else {
            clearInterval(type2);
            setPhase(4); // Show Subtitle
         }
       }, 30);
    }, 1200);

    const seq3 = setTimeout(() => setPhase(5), 3500); // Show Card
    const seq4 = setTimeout(() => setPhase(6), 13500); // Show Button (10s AFTER card appears approx, total 13.5s from start)
    // NOTE: User asked for "10 seconds delay", interpreted as 10s after the main content is readable or total time. 
    // Adjusted to be 10s from mount to button or 10s from card. 
    // Let's set it to 10 seconds TOTAL from mount for good UX, or 10s wait. 
    // Setting to 10000ms from MOUNT.
    
    const buttonTimer = setTimeout(() => setPhase(6), 10000); 

    return () => {
      clearInterval(type1);
      clearTimeout(seq2);
      clearTimeout(seq3);
      clearTimeout(buttonTimer);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#020617] relative overflow-hidden font-sans selection:bg-purple-500/30">
      
      {/* Cinematic Background */}
      <div className={`absolute top-0 left-0 w-full h-full transition-opacity duration-[2000ms] ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      <div className="max-w-4xl w-full relative z-10 flex flex-col items-center">
        
        {/* --- TITLE SECTION --- */}
        <div className="text-center mb-12 min-h-[160px] md:min-h-[120px] flex flex-col items-center justify-center">
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight max-w-5xl">
            <span className="opacity-90">{text1}</span>
            
            {/* The Gradient Word */}
            <span className={`inline-block transition-all duration-1000 transform ${phase >= 2 ? 'opacity-100 translate-y-0 scale-100 blur-0' : 'opacity-0 translate-y-4 scale-95 blur-sm'}`}>
              <span className="bg-gradient-to-r from-violet-500 via-purple-400 to-blue-400 bg-clip-text text-transparent pb-2 drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                movimiento
              </span>
            </span>

            <span className="opacity-90">{text2}</span>
            {phase < 4 && <span className="animate-pulse text-purple-400 ml-1">|</span>}
          </h1>

          {/* Subtitle */}
          <div className={`mt-6 transition-all duration-1000 delay-300 ${phase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="text-xl md:text-2xl text-slate-400 font-light tracking-wide">
              Si solo hicieras una cosa en las próximas semanas, debería ser esta.
            </p>
          </div>
        </div>

        {/* --- PRIORITY CARD --- */}
        <div className={`w-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) ${phase >= 5 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'}`}>
           <div className="relative group">
              {/* Glow behind card */}
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              
              <div className="relative glass-panel p-8 md:p-14 border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl flex flex-col items-center text-center">
                  
                  {/* Badge */}
                  <div className="mb-8">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                      Prioridad #1
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-10 tracking-tight leading-tight">
                    {focus.title}
                  </h2>

                  {/* Grid Details */}
                  <div className="grid md:grid-cols-3 gap-12 w-full border-t border-white/5 pt-10">
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Impacto</span>
                        <p className="text-white/90 text-sm font-medium leading-relaxed">{focus.impact}</p>
                      </div>
                      <div className="space-y-3 relative">
                        {/* Vertical separators for desktop */}
                        <div className="hidden md:block absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Por qué ahora</span>
                        <p className="text-white/90 text-sm font-medium leading-relaxed">{focus.reasoning}</p>
                        <div className="hidden md:block absolute right-0 top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                      </div>
                      <div className="space-y-3">
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">Desbloquea</span>
                        <p className="text-white/90 text-sm font-medium leading-relaxed">{focus.unlocks}</p>
                      </div>
                  </div>
              </div>
           </div>
        </div>

        {/* --- CTA BUTTON (Delayed 10s) --- */}
        <div className={`mt-12 transition-all duration-1000 ${phase >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <Button 
            onClick={onContinue} 
            className="text-lg px-12 py-5 bg-white text-slate-950 hover:bg-slate-200 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)] border-none font-bold tracking-wide"
          >
            Empezar esta Prioridad
          </Button>
          <p className="text-slate-600 text-xs mt-4 animate-pulse">
            Tu Director IA ha preparado el plan de ejecución.
          </p>
        </div>

      </div>
    </div>
  );
};

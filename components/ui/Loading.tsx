
import React, { useEffect, useRef } from 'react';
import { Button } from './Button';

export const Loading: React.FC<{ 
  message?: string; 
  subMessage?: string; 
  streamLog?: string;
  onReset?: () => void;
  showReset?: boolean;
}> = ({ 
  message = "Analizando estrategia...", 
  subMessage,
  streamLog,
  onReset,
  showReset = false
}) => {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [streamLog]);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8 w-full max-w-2xl mx-auto animate-fade-in">
      <div className="relative w-24 h-24">
        {/* Outer Glow */}
        <div className="absolute top-0 left-0 w-full h-full rounded-full bg-primary-500/20 blur-xl animate-pulse-slow"></div>
        {/* Spinner Track */}
        <div className="absolute top-0 left-0 w-full h-full border-2 border-slate-800 rounded-full"></div>
        {/* Spinner */}
        <div className="absolute top-0 left-0 w-full h-full border-2 border-primary-400 rounded-full border-t-transparent animate-spin"></div>
        {/* Inner Dot */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-primary-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_#22d3ee]"></div>
      </div>
      
      <div className="text-center space-y-4 w-full">
        <p className="text-white font-bold text-lg animate-pulse tracking-widest uppercase">{message}</p>
        {subMessage && <p className="text-slate-500 text-sm">{subMessage}</p>}
        
        {showReset && onReset && (
          <div className="pt-4 animate-fade-in-up">
            <p className="text-red-400 text-xs mb-3">¿Tarda demasiado? Es posible que la conexión sea lenta.</p>
            <Button onClick={onReset} variant="secondary" className="text-xs px-4 py-2 h-auto">
              Recargar / Reiniciar Sesión
            </Button>
          </div>
        )}
      </div>

      {/* Streaming Log (Matrix Effect) */}
      {streamLog && (
        <div className="w-full bg-black/50 border border-primary-500/20 rounded-xl p-4 font-mono text-xs h-48 overflow-hidden relative shadow-inner backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-slate-900/90 to-transparent z-10 pointer-events-none"></div>
          <div 
            ref={logRef} 
            className="h-full overflow-y-auto space-y-1 text-primary-400/80 scrollbar-hide pb-4"
          >
             <div className="text-slate-500 mb-2">Initialize AI Core... Connected.</div>
             <div className="whitespace-pre-wrap break-words opacity-80">{streamLog}</div>
             <div className="animate-pulse text-primary-500">_</div>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none"></div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransitionScreenProps {
  onComplete: () => void;
}

export const TransitionScreen: React.FC<TransitionScreenProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  
  const messages = [
    "Conectando con tu cuenta...",
    "Analizando tu forma de trabajar...",
    "Preparando tu dirección estratégica...",
    "Todo listo."
  ];

  useEffect(() => {
    // Sequence timing
    const timers = [
      setTimeout(() => setStep(1), 1500),
      setTimeout(() => setStep(2), 3500),
      setTimeout(() => setStep(3), 5500),
      setTimeout(() => {
        onComplete(); // Finish transition
      }, 7000)
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/5 rounded-full blur-[120px] animate-pulse-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        
        {/* Logo Pulse (Icon Only) */}
        <motion.div 
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
           className="w-16 h-16 flex items-center justify-center mb-12 relative"
        >
           <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full"></div>
           <img 
             src="/icon-light.png" 
             alt="Loading" 
             className="w-12 h-12 object-contain relative z-10"
           />
        </motion.div>

        {/* Dynamic Text */}
        <div className="h-12 flex items-center justify-center overflow-hidden w-full max-w-lg text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={step}
              initial={{ y: 20, opacity: 0, filter: 'blur(10px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: -20, opacity: 0, filter: 'blur(10px)' }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-lg md:text-xl font-medium text-white tracking-wide"
            >
              {messages[step]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Loading Bar */}
        <div className="w-48 h-1 bg-slate-900 rounded-full mt-8 overflow-hidden">
           <motion.div 
             className="h-full bg-primary-500 shadow-[0_0_10px_#22d3ee]"
             initial={{ width: "0%" }}
             animate={{ width: "100%" }}
             transition={{ duration: 7, ease: "easeInOut" }}
           />
        </div>

      </div>
    </div>
  );
};
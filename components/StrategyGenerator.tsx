
import React, { useEffect, useState, useRef } from 'react';
import { Loading } from './ui/Loading';
import { UserProfile, BusinessAudit, ComprehensiveStrategy } from '../types';
import { generateAuditStream, generateActionPlan } from '../services/geminiService';
import { saveStrategySnapshot } from '../services/business.service';
import { Button } from './ui/Button';

interface StrategyGeneratorProps {
  profile: UserProfile;
  businessId: string;
  onComplete: (strategy: ComprehensiveStrategy) => void;
  onError: (msg: string) => void;
  lang: 'es' | 'en';
}

export const StrategyGenerator: React.FC<StrategyGeneratorProps> = ({ profile, businessId, onComplete, onError, lang }) => {
  const [status, setStatus] = useState<'audit' | 'plan' | 'saving' | 'error'>('audit');
  const [logs, setLogs] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const auditRef = useRef<BusinessAudit | null>(null);
  const hasStartedRef = useRef(false);

  const runGeneration = async () => {
    if (hasStartedRef.current && status !== 'error') return;
    hasStartedRef.current = true;
    setLogs('');
    setStatus('audit');

    try {
      // STEP 1: AUDIT
      if (!auditRef.current) {
        console.log("Starting Audit Generation...");
        const audit = await generateAuditStream(profile, lang, (text) => {
          setLogs(prev => text.length > prev.length ? text : prev); // Simple append protection
        });
        auditRef.current = audit;
        // Wait a small moment for UX
        await new Promise(r => setTimeout(r, 1000));
      }

      // STEP 2: STRATEGY
      setStatus('plan');
      console.log("Starting Plan Generation...");
      const plan = await generateActionPlan(profile, auditRef.current!, lang);
      
      const fullStrategy: ComprehensiveStrategy = {
        ...plan,
        audit: auditRef.current!
      };

      // STEP 3: SAVE
      setStatus('saving');
      await saveStrategySnapshot(businessId, profile, fullStrategy);
      
      onComplete(fullStrategy);

    } catch (e: any) {
      console.error("Generation failed:", e);
      setStatus('error');
      hasStartedRef.current = false; // Allow retry
    }
  };

  useEffect(() => {
    runGeneration();
  }, []); // Run once on mount

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-950 p-6 text-center">
        <div className="glass-panel p-8 border-red-500/30 max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">Error de Generación</h3>
          <p className="text-slate-400 text-sm mb-6">
            La IA encontró un obstáculo. No te preocupes, tu perfil está guardado.
          </p>
          <Button onClick={() => { setRetryCount(c => c + 1); runGeneration(); }}>
            Reintentar Generación
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <Loading 
        message={
          status === 'audit' ? "Analizando tu negocio a profundidad..." :
          status === 'plan' ? "Diseñando tu plan de acción táctico..." :
          "Guardando tu estrategia..."
        }
        subMessage="Esto puede tomar unos 30-60 segundos. No cierres la ventana."
        streamLog={status === 'audit' ? logs : undefined}
      />
    </div>
  );
};

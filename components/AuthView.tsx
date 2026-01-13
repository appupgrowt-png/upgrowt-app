
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2, Play } from 'lucide-react';

interface AuthViewProps {
  onSuccess: (userId: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');

  const checkConfig = () => {
    if (!isSupabaseConfigured()) {
      return false;
    }
    return true;
  };

  const handleDemoLogin = () => {
      setIsLoading(true);
      setTimeout(() => {
          onSuccess('demo-user-123');
      }, 1000);
  };

  const handleGoogleLogin = async () => {
    if (!checkConfig()) {
        setError('Configuración incompleta. Usa el Modo Demo.');
        return;
    }
    try {
      setIsLoading(true);
      setError('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin 
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkConfig()) {
        setError('Configuración incompleta. Usa el Modo Demo.');
        return;
    }
    if (!email) return;
    
    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Error enviando el enlace');
    } finally {
      setIsLoading(false);
    }
  };

  // --- STATE: EMAIL SENT ---
  if (emailSent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(34,211,238,0.1),transparent_50%)]"></div>
        <div className="glass-panel w-full max-w-md p-10 text-center relative z-10 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <Mail className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Revisa tu correo</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Hemos enviado un enlace mágico a <span className="text-white font-medium">{email}</span>.
          </p>
          <button onClick={() => setEmailSent(false)} className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">← Probar otro correo</button>
        </div>
      </div>
    );
  }

  // --- STATE: LOGIN FORM ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-[420px] p-8 md:p-12 relative z-10 border-white/10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-10">
          <img src="/logo-light.png" alt="UpGrowth Logo" className="h-10 w-auto relative z-10 mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">Identifícate</h1>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleMagicLink} className="space-y-4">
             <input 
               type="email" 
               value={email}
               onChange={(e) => setEmail(e.target.value)}
               placeholder="nombre@empresa.com"
               disabled={!isSupabaseConfigured()}
               className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 h-12 text-white placeholder:text-slate-600 focus:border-primary-500 outline-none"
             />
             <button 
               type="submit"
               disabled={isLoading || !email || !isSupabaseConfigured()}
               className="w-full h-12 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold text-sm shadow-neon flex items-center justify-center gap-2"
             >
               {isLoading && !emailSent ? 'Enviando...' : <>Continuar con Email <ArrowRight className="w-4 h-4" /></>}
             </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0b1221] px-2 text-slate-500">O un clic</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading || !isSupabaseConfigured()}
            className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-sm flex items-center justify-center gap-3"
          >
             Continuar con Google
          </button>
          
          {!isSupabaseConfigured() && (
             <div className="mt-4 pt-4 border-t border-white/5 text-center animate-fade-in-up">
                <p className="text-xs text-yellow-500/80 mb-3">⚠️ Base de datos no configurada</p>
                <button 
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    className="w-full h-12 border border-primary-500/50 text-primary-400 rounded-xl font-bold text-sm hover:bg-primary-500/10 transition-all flex items-center justify-center gap-2"
                >
                    <Play className="w-4 h-4 fill-current" />
                    Entrar en Modo Demo
                </button>
             </div>
          )}

          {error && <div className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}
        </div>
      </motion.div>
    </div>
  );
};


import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';

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
      setError('Error de configuración: Faltan credenciales de Supabase en el archivo .env');
      return false;
    }
    return true;
  };

  const handleGoogleLogin = async () => {
    if (!checkConfig()) return;
    try {
      setIsLoading(true);
      setError('');
      // Supabase manejará el redirect automáticamente. 
      // MainApp detectará el cambio de sesión al volver.
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
    if (!checkConfig()) return;
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
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel w-full max-w-md p-10 text-center relative z-10 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]"
        >
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <Mail className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Revisa tu correo</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Hemos enviado un enlace mágico a <span className="text-white font-medium">{email}</span>.<br/>
            Haz clic en el enlace para entrar.
          </p>
          <button 
            onClick={() => setEmailSent(false)}
            className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            ← Probar otro correo
          </button>
        </motion.div>
      </div>
    );
  }

  // --- STATE: LOGIN FORM ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-panel w-full max-w-[420px] p-8 md:p-12 relative z-10 border-white/10 shadow-2xl"
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6 relative group"
          >
            <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity"></div>
            <img 
              src="/logo-light.png" 
              alt="UpGrowth Logo" 
              className="h-10 w-auto relative z-10"
            />
          </motion.div>
          
          <h1 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">Bienvenido de nuevo</h1>
          <p className="text-slate-400 text-center text-sm leading-relaxed max-w-[280px]">
            Tu negocio no necesita más ideas.<br/>
            <span className="text-white font-medium">Necesita dirección.</span>
          </p>
        </div>

        {/* Auth Container */}
        <div className="space-y-6">
          
          {/* Email Form */}
          <form onSubmit={handleMagicLink} className="space-y-4">
             <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@empresa.com"
                  required
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 h-12 text-white placeholder:text-slate-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 outline-none transition-all group-hover:border-white/20"
                />
             </div>
             
             <button 
               type="submit"
               disabled={isLoading || !email}
               className="w-full h-12 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-xl font-bold text-sm shadow-neon hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {isLoading && !emailSent ? 'Enviando...' : (
                 <>
                   Continuar con Email <ArrowRight className="w-4 h-4" />
                 </>
               )}
             </button>
          </form>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/5"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0b1221] px-2 text-slate-500">O un clic</span>
            </div>
          </div>

          {/* Google Auth with Official Logo */}
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-12 bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading && !email ? (
               <Loader2 className="animate-spin w-5 h-5 text-slate-900"/>
            ) : (
               <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar con Google
               </>
            )}
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
           <p className="text-[10px] text-slate-600 font-medium tracking-wide">
             SIN SPAM. SIN HUMO. DIRECCIÓN REAL.
           </p>
        </div>

      </motion.div>
    </div>
  );
};

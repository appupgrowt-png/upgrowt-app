
import React, { useState } from 'react';
import { Button } from './ui/Button';
import { signIn, signUp } from '../services/auth.service';

interface AuthViewProps {
  onSuccess: (userId: string) => void;
  initialMode?: 'login' | 'register';
  onCancel?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, initialMode = 'login', onCancel }) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      let data;
      if (mode === 'login') {
        data = await signIn(email, password);
      } else {
        data = await signUp(email, password);
      }
      
      if (data.user) {
        onSuccess(data.user.id);
      } else if (mode === 'register' && !data.session) {
        // Handle case where email confirmation might be required
        setError('Por favor revisa tu email para confirmar tu cuenta (si está habilitado).');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error de autenticación');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-md p-8 relative shadow-2xl border-primary-500/30">
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-500 hover:text-white"
          >
            ✕
          </button>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-neon rotate-3">
            <span className="text-white font-bold text-2xl">up</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {mode === 'login' ? 'Bienvenido de nuevo' : 'Guarda tu progreso'}
          </h2>
          <p className="text-slate-400 text-sm">
            {mode === 'login' 
              ? 'Accede a tu estrategia y plan de crecimiento.' 
              : 'Crea una cuenta gratuita para guardar tu diagnóstico y plan.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input w-full p-3 rounded-xl text-white"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full p-3 rounded-xl text-white"
              placeholder="••••••••"
            />
          </div>

          <Button 
            type="submit" 
            isLoading={isLoading} 
            className="w-full mt-2 shadow-neon"
          >
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Button>
        </form>

        <div className="mt-6 text-center pt-6 border-t border-white/5">
          <p className="text-slate-500 text-xs">
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button 
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
              }}
              className="ml-2 text-primary-400 font-bold hover:text-white transition-colors"
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia Sesión'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

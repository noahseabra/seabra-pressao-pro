import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from '../components/Logo';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } from '../firebase';

interface AuthViewProps {
  error: string | null;
  setError: (error: string | null) => void;
}

export function AuthView({ error, setError }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setAuthLoading(true);
    setError(null);

    try {
      if (isLoginMode) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err: any) {
      console.error('Erro de Autenticação:', err);
      let message = 'Erro ao realizar autenticação.';
      
      if (err.code === 'auth/unauthorized-domain') {
        message = 'ERRO: Este domínio não está autorizado no Firebase. Se você já adicionou no console, clique em "Export to GitHub" nas configurações do AI Studio para atualizar o site na Vercel.';
      } else if (err.code === 'auth/user-not-found') {
        message = 'Usuário não encontrado.';
      } else if (err.code === 'auth/wrong-password') {
        message = 'Senha incorreta.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.message) {
        message = err.message;
      }
      
      setError(message);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative"
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="flex flex-col items-center mb-8 relative z-10">
          <Logo size="lg" />
          <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">Seabra Pressão Pro</h1>
          <p className="text-zinc-500 text-sm mt-1">{isLoginMode ? 'Bem-vindo de volta' : 'Crie sua conta gratuita'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 relative z-10">
          <div className="space-y-1.5 focus-within:z-10 group">
            <label className="text-xs font-medium text-zinc-500 ml-1 uppercase tracking-widest">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm shadow-inner"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5 group">
            <label className="text-xs font-medium text-zinc-500 ml-1 uppercase tracking-widest">Senha</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLoginMode ? "current-password" : "new-password"}
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-12 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm shadow-inner"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs"
              >
                <div className="flex-shrink-0 mt-0.5">⚠️</div>
                <p className="leading-relaxed font-medium">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={authLoading}
            className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold rounded-2xl py-4 transition-all duration-300 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 group active:scale-[0.98] disabled:opacity-50 disabled:scale-100 disabled:pointer-events-none mt-4"
          >
            {authLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{isLoginMode ? 'Entrar Agora' : 'Criar Minha Conta'}</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-zinc-800 space-y-4 relative z-10">
          <button 
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError(null);
            }}
            className="w-full text-zinc-500 hover:text-white transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            {isLoginMode ? "Ainda não tem conta? Clique para criar" : "Já tem conta? Clique para entrar"}
          </button>
          
          <button 
            type="button"
            onClick={signInWithGoogle}
            className="w-full bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-2xl py-3.5 transition-all flex items-center justify-center gap-3 text-sm text-zinc-300 active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-4 h-4" />
            Entrar com Google
          </button>
          
          {isLoginMode && (
            <button 
              type="button"
              onClick={async () => {
                if (!email) {
                  setError('Digite seu e-mail para recuperar a senha.');
                  return;
                }
                try {
                  await resetPassword(email);
                  setError('E-mail de recuperação enviado!');
                } catch (err: any) {
                  setError(err.message);
                }
              }}
              className="w-full text-zinc-600 hover:text-zinc-400 underline decoration-zinc-800 underline-offset-4 transition-colors text-xs text-center"
            >
              Esqueceu sua senha?
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

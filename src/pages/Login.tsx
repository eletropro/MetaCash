import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Mail, Lock, ArrowRight, Sparkles, Eye, EyeOff, Key } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setMessage('E-mail de redefinição enviado com sucesso!');
      setTimeout(() => setShowForgotModal(false), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090B] p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/5 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#121214] rounded-[2.5rem] shadow-2xl p-10 border border-white/5">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-brand-500 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-brand-500/20 rotate-3">
              <Zap size={40} fill="currentColor" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">MetaCash</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="h-px w-4 bg-zinc-800" />
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">SaaS de Gestão</p>
              <span className="h-px w-4 bg-zinc-800" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-zinc-900 focus:bg-black focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-white font-medium"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 rounded-2xl border border-white/10 bg-zinc-900 focus:bg-black focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all text-white font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[10px] font-bold text-brand-500 hover:text-brand-400 uppercase tracking-wider"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-medium"
              >
                {error}
              </motion.div>
            )}

            {message && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-xs font-medium"
              >
                {message}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 text-white font-bold py-5 rounded-2xl hover:bg-brand-400 disabled:opacity-50 transition-all shadow-xl shadow-brand-500/20 flex items-center justify-center gap-3 group"
            >
              {loading ? 'Processando...' : (isLogin ? 'Acessar Plataforma' : 'Criar Minha Conta')}
              {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-zinc-500 text-sm font-medium hover:text-brand-500 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles size={16} />
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
            </button>
          </div>
        </div>
        
        <p className="text-center text-zinc-600 text-[10px] mt-8 uppercase tracking-widest font-bold">
          © 2026 MetaCash • Todos os direitos reservados
        </p>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121214] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-500/10 text-brand-500 rounded-xl flex items-center justify-center">
                    <Key size={20} />
                  </div>
                  <h3 className="text-xl font-bold text-white">Recuperar Senha</h3>
                </div>
                <button onClick={() => setShowForgotModal(false)} className="text-zinc-500 hover:text-white">
                  <ArrowRight className="rotate-180" size={24} />
                </button>
              </div>

              <p className="text-zinc-400 text-sm mb-6">
                Insira seu e-mail abaixo para receber um link de redefinição de senha.
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl border border-white/10 bg-zinc-900 focus:bg-black outline-none transition-all text-white font-medium"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-500 text-white font-bold py-4 rounded-2xl hover:bg-brand-400 transition-all shadow-xl shadow-brand-500/20"
                >
                  Enviar Link de Recuperação
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

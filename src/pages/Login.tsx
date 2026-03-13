import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { Zap, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-100/50 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-100/30 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-zinc-100">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-2xl shadow-brand-200 rotate-3">
              <Zap size={40} fill="currentColor" />
            </div>
            <h1 className="text-4xl font-black text-zinc-900 tracking-tight">MetaCash</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="h-px w-4 bg-zinc-200" />
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">SaaS de Gestão</p>
              <span className="h-px w-4 bg-zinc-200" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 focus:bg-white focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all text-zinc-900 font-medium"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-zinc-100 bg-zinc-50/50 focus:bg-white focus:ring-4 focus:ring-brand-50 focus:border-brand-500 outline-none transition-all text-zinc-900 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-medium"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 text-white font-bold py-5 rounded-2xl hover:bg-brand-700 transition-all shadow-xl shadow-brand-100 flex items-center justify-center gap-3 group"
            >
              {isLogin ? 'Acessar Plataforma' : 'Criar Minha Conta'}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-zinc-50 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-zinc-400 text-sm font-medium hover:text-brand-600 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <Sparkles size={16} />
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre agora'}
            </button>
          </div>
        </div>
        
        <p className="text-center text-zinc-400 text-[10px] mt-8 uppercase tracking-widest font-bold">
          © 2026 MetaCash • Todos os direitos reservados
        </p>
      </motion.div>
    </div>
  );
}

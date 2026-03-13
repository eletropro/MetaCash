import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';
import { getFinancialInsights } from '../services/gemini';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Wallet, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home({ user }: { user: User }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<string>('Carregando insights...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
      setLoading(false);
      
      if (data.length > 0) {
        getFinancialInsights(data).then(setInsights);
      } else {
        setInsights('Adicione algumas transações para receber insights da IA!');
      }
    });

    return () => unsubscribe();
  }, [user.uid]);

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const balance = totals.income - totals.expense;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">Olá, {user.email?.split('@')[0]}</h2>
          <p className="text-zinc-500 text-sm">Bem-vindo ao seu painel de controle MetaCash.</p>
        </div>
        <div className="hidden sm:block">
          <Link to="/finance" className="btn-secondary text-xs">
            Ver Financeiro <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Balance Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-brand-600 rounded-[2rem] p-8 sm:p-10 text-white shadow-2xl shadow-brand-200 relative overflow-hidden"
      >
        <div className="relative z-10 flex flex-col gap-6">
          <div>
            <p className="text-brand-100 text-[10px] font-bold uppercase tracking-widest mb-1">Saldo Disponível</p>
            <h3 className="text-4xl sm:text-5xl font-bold tracking-tighter">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1.5 text-brand-100 text-[9px] font-bold uppercase tracking-wider mb-1">
                <TrendingUp size={12} className="text-emerald-400" /> Entradas
              </div>
              <p className="text-lg font-bold">R$ {totals.income.toLocaleString('pt-BR')}</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
              <div className="flex items-center gap-1.5 text-brand-100 text-[9px] font-bold uppercase tracking-wider mb-1">
                <TrendingDown size={12} className="text-rose-400" /> Saídas
              </div>
              <p className="text-lg font-bold">R$ {totals.expense.toLocaleString('pt-BR')}</p>
            </div>
          </div>
        </div>
        <Wallet className="absolute -right-12 -bottom-12 text-white/5" size={200} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Insights */}
        <div className="lg:col-span-1">
          <section className="bg-brand-50 rounded-[2rem] p-8 border border-brand-100 h-full relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-brand-700 font-bold mb-6">
                <Sparkles size={24} />
                <span className="text-lg">Insight da IA</span>
              </div>
              <p className="text-brand-900 text-lg leading-relaxed font-medium">
                "{insights}"
              </p>
            </div>
            <Sparkles className="absolute -right-4 -bottom-4 text-brand-200/30" size={120} />
          </section>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <section className="card-saas p-8">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-xl font-bold text-zinc-900 tracking-tight">Atividade Recente</h4>
              <Link to="/finance" className="text-brand-600 text-sm font-bold hover:underline">Ver tudo</Link>
            </div>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{t.description}</p>
                      <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{new Date(t.date).toLocaleDateString('pt-BR')} • {t.category}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
              {transactions.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet className="text-zinc-300" size={32} />
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">Nenhuma transação encontrada.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

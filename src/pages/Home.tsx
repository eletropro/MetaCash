import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, UserProfile, Loan } from '../types';
import { getFinancialInsights } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Wallet, Sparkles, ArrowRight, AlertCircle, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home({ user }: { user: User }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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
    }, (error) => {
      console.error('Home Transactions Snapshot Error:', error);
      setLoading(false);
    });

    const qLoans = query(
      collection(db, 'loans'),
      where('uid', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribeLoans = onSnapshot(qLoans, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    });

    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    };
    fetchProfile();

    return () => {
      unsubscribe();
      unsubscribeLoans();
    };
  }, [user.uid]);

  const today = new Date().getDate();
  const dueToday = loans.filter(l => l.paymentDay === today);

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  const balance = totals.income - totals.expense;
  const monthlyGoal = profile?.monthlyGoal || 10000;
  const goalProgress = Math.min((totals.income / monthlyGoal) * 100, 100);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Olá, {profile?.ownerName || user.email?.split('@')[0]}
          </h2>
          <p className="text-zinc-400 text-sm">Bem-vindo ao seu painel de controle MetaCash.</p>
        </div>
        <div className="hidden sm:block">
          <Link to="/finance" className="btn-secondary text-xs">
            Ver Financeiro <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <AnimatePresence>
        {dueToday.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2rem] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white">Parcelas Vencendo Hoje</h4>
                  <p className="text-xs text-zinc-400">Você tem {dueToday.length} {dueToday.length === 1 ? 'parcela' : 'parcelas'} de empréstimo para receber hoje.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {dueToday.map(loan => (
                  <div key={loan.id} className="bg-zinc-900/50 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
                    <Calendar size={12} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-zinc-300">{loan.customerName}</span>
                  </div>
                ))}
                <Link to="/loans" className="btn-primary py-2 px-4 text-xs ml-2">
                  Gerenciar
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance Card */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="bg-brand-500 rounded-[2rem] p-8 text-white shadow-2xl shadow-brand-500/10 relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <p className="text-brand-100 text-[10px] font-black uppercase tracking-widest mb-1">Saldo Disponível</p>
              <h3 className="text-4xl font-bold tracking-tighter">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-1.5 text-brand-100 text-[9px] font-bold uppercase tracking-wider mb-1">
                  <TrendingUp size={12} className="text-emerald-300" /> Entradas
                </div>
                <p className="text-lg font-bold">R$ {totals.income.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/10">
                <div className="flex items-center gap-1.5 text-brand-100 text-[9px] font-bold uppercase tracking-wider mb-1">
                  <TrendingDown size={12} className="text-rose-300" /> Saídas
                </div>
                <p className="text-lg font-bold">R$ {totals.expense.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>
          <Wallet className="absolute -right-12 -bottom-12 text-white/5" size={200} />
        </motion.div>

        {/* Monthly Goal Card */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="card-premium p-8 flex flex-col justify-between"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-1">Meta de Faturamento</p>
                <h3 className="text-3xl font-bold text-white tracking-tighter">R$ {monthlyGoal.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="bg-brand-500/20 text-brand-400 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {goalProgress.toFixed(0)}%
              </div>
            </div>

            <div className="space-y-3">
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                <span className="text-brand-400">R$ {totals.income.toLocaleString('pt-BR')} alcançados</span>
                <span className="text-zinc-500">Faltam R$ {(monthlyGoal - totals.income > 0 ? monthlyGoal - totals.income : 0).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            <Sparkles size={14} className="text-brand-400" />
            <span>Mantenha o ritmo para bater sua meta!</span>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* AI Insights */}
        <div className="lg:col-span-1">
          <section className="bg-zinc-900/50 rounded-[2rem] p-8 border border-white/5 h-full relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-brand-400 font-bold mb-6">
                <Sparkles size={24} />
                <span className="text-lg">Insight da IA</span>
              </div>
              <p className="text-zinc-100 text-lg leading-relaxed font-medium">
                "{insights}"
              </p>
            </div>
            <Sparkles className="absolute -right-4 -bottom-4 text-brand-500/10" size={120} />
          </section>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <section className="card-saas p-8">
            <div className="flex justify-between items-center mb-8">
              <h4 className="text-xl font-bold text-white tracking-tight">Atividade Recente</h4>
              <Link to="/finance" className="text-brand-400 text-sm font-bold hover:underline">Ver tudo</Link>
            </div>
            <div className="space-y-4">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-white">{t.description}</p>
                      <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{formatDate(t.date)} • {t.category}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
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

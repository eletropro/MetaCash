import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, TrendingUp, TrendingDown, Filter, X, Wallet } from 'lucide-react';

export default function Finance({ user }: { user: User }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('Todos');

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    await addDoc(collection(db, 'transactions'), {
      uid: user.uid,
      description,
      amount: parseFloat(amount),
      type,
      category,
      date: new Date().toISOString()
    });

    setDescription('');
    setAmount('');
    setCategory('');
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, 'transactions', id));
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'Todos') return true;
    if (filter === 'Entradas') return t.type === 'income';
    if (filter === 'Saídas') return t.type === 'expense';
    return t.category === filter;
  });

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 sm:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Financeiro</h2>
          <p className="text-zinc-500 text-xs sm:text-sm">Gestão completa de fluxo de caixa.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary w-full sm:w-auto py-3 sm:py-2.5">
          <Plus size={20} /> Nova Transação
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="card-saas p-5 sm:p-6 flex items-center gap-4">
          <div className="p-3 sm:p-4 bg-brand-50 text-brand-600 rounded-2xl">
            <Wallet size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Saldo Atual</p>
            <p className="text-xl sm:text-2xl font-bold text-zinc-900">R$ {(totals.income - totals.expense).toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="card-saas p-5 sm:p-6 flex items-center gap-4">
          <div className="p-3 sm:p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Total Entradas</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">R$ {totals.income.toLocaleString('pt-BR')}</p>
          </div>
        </div>
        <div className="card-saas p-5 sm:p-6 flex items-center gap-4">
          <div className="p-3 sm:p-4 bg-rose-50 text-rose-600 rounded-2xl">
            <TrendingDown size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Total Saídas</p>
            <p className="text-xl sm:text-2xl font-bold text-rose-600">R$ {totals.expense.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['Todos', 'Entradas', 'Saídas', 'Serviço', 'Material', 'Ferramenta', 'Transporte'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border ${
              filter === f 
                ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-100' 
                : 'bg-white text-zinc-500 border-zinc-100 hover:border-zinc-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card-saas overflow-hidden">
        <div className="divide-y divide-zinc-100">
          {filteredTransactions.map((t) => (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              key={t.id}
              className="p-5 flex items-center justify-between group hover:bg-zinc-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {t.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{t.description}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{t.category} • {new Date(t.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <p className={`text-lg font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR')}
                </p>
                <button onClick={() => t.id && handleDelete(t.id)} className="p-2 text-zinc-300 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
          {filteredTransactions.length === 0 && (
            <div className="p-20 text-center">
              <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="text-zinc-300" size={32} />
              </div>
              <p className="text-zinc-400 text-sm font-medium">Nenhuma transação encontrada para este filtro.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto pt-10">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto no-scrollbar"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 sticky top-0 z-10">
                <h3 className="text-xl font-bold text-zinc-900">Nova Transação</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-zinc-400 hover:text-zinc-600 active:scale-90 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-zinc-500'}`}
                  >
                    Saída
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Descrição</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-saas"
                    placeholder="Ex: Instalação de chuveiro"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-saas"
                    placeholder="0,00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-saas bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Material">Material</option>
                    <option value="Ferramenta">Ferramenta</option>
                    <option value="Transporte">Transporte</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <button type="submit" className="w-full btn-primary py-4 text-lg mt-4">
                  Salvar Transação
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

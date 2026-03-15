import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loan, Customer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Calculator, Trash2, Percent, Landmark, X, ArrowRight, Search, ChevronRight } from 'lucide-react';

export default function Loans({ user }: { user: User }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  // Calculator state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [type, setType] = useState<'interest_only' | 'principal_interest'>('interest_only');

  useEffect(() => {
    const q = query(collection(db, 'loans'), where('uid', '==', user.uid), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    });

    const qCust = query(collection(db, 'customers'), where('uid', '==', user.uid));
    const unsubscribeCust = onSnapshot(qCust, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    return () => {
      unsubscribe();
      unsubscribeCust();
    };
  }, [user.uid]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'loans'), {
      uid: user.uid,
      customerId: customerId || undefined,
      customerName: borrowerName || customerSearch,
      borrowerName: borrowerName || customerSearch,
      principal: parseFloat(principal),
      interestRate: parseFloat(interestRate),
      type,
      startDate: new Date().toISOString(),
      status: 'active'
    });
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setCustomerId('');
    setCustomerSearch('');
    setBorrowerName('');
    setPrincipal('');
    setInterestRate('');
  };

  const calculateMonthly = (p: number, r: number, t: 'interest_only' | 'principal_interest') => {
    const monthlyRate = r / 100;
    if (t === 'interest_only') {
      return p * monthlyRate;
    } else {
      // Simple amortization for demo (12 months)
      return (p * monthlyRate) + (p / 12);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 sm:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Empréstimos</h2>
          <p className="text-zinc-400 text-xs sm:text-sm">Gestão de capital e juros ativos.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary w-full sm:w-auto py-3 sm:py-2.5">
          <Plus size={20} /> Novo Empréstimo
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {loans.map((l) => (
          <motion.div
            key={l.id}
            layout
            className="card-saas p-6 sm:p-8 space-y-6"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-amber-500/10 rounded-[1.25rem] flex items-center justify-center text-amber-500">
                  <Landmark size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">{l.customerName || l.borrowerName}</h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    {l.type === 'interest_only' ? 'Apenas Juros' : 'Juros + Capital'}
                  </p>
                </div>
              </div>
              <button onClick={() => l.id && deleteDoc(doc(db, 'loans', l.id))} className="text-zinc-600 hover:text-rose-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Principal</p>
                <p className="text-lg font-bold text-white">R$ {l.principal.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Taxa Mensal</p>
                <p className="text-lg font-bold text-white">{l.interestRate}%</p>
              </div>
            </div>

            <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-900/20 flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-widest mb-1">Pagamento Mensal</p>
                <p className="text-3xl font-bold">
                  R$ {calculateMonthly(l.principal, l.interestRate, l.type).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Percent className="text-white/10 absolute -right-4 -bottom-4" size={80} />
            </div>
          </motion.div>
        ))}
        {loans.length === 0 && (
          <div className="md:col-span-2 card-saas p-20 text-center">
            <div className="bg-zinc-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calculator className="text-zinc-600" size={40} />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">Nenhum empréstimo ativo</h4>
            <p className="text-zinc-500 max-w-xs mx-auto">Comece a gerenciar seus empréstimos e juros clicando no botão acima.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto pt-10">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto no-scrollbar border border-zinc-800"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-bold text-white">Novo Empréstimo</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Vincular Cliente (CRM)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setBorrowerName(e.target.value);
                        setShowCustomerResults(true);
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                      className="input-saas pl-12 py-3"
                      placeholder="Buscar cliente ou digitar nome..."
                    />
                  </div>
                  
                  <AnimatePresence>
                    {showCustomerResults && customerSearch && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-30 w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto no-scrollbar"
                      >
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setCustomerId(c.id!);
                                setCustomerSearch(c.name);
                                setBorrowerName(c.name);
                                setShowCustomerResults(false);
                              }}
                              className="w-full p-4 text-left hover:bg-zinc-800 active:bg-zinc-700 flex items-center justify-between border-b border-zinc-800 last:border-0"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold text-white">{c.name}</span>
                                <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{c.phone}</span>
                              </div>
                              <ChevronRight size={16} className="text-zinc-400" />
                            </button>
                          ))
                        ) : (
                          <div className="p-6 text-center text-zinc-400 text-sm">Nenhum cliente encontrado.</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Valor Principal</label>
                    <input
                      type="number"
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      className="input-saas"
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Juros Mensal (%)</label>
                    <input
                      type="number"
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      className="input-saas"
                      placeholder="0%"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Tipo de Pagamento</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="input-saas bg-zinc-800"
                  >
                    <option value="interest_only">Apenas Juros</option>
                    <option value="principal_interest">Juros + Capital (Amortização)</option>
                  </select>
                </div>
                <button type="submit" className="w-full btn-primary py-4 text-lg mt-4">
                  Salvar Empréstimo
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Customer, Budget, Loan } from '../types';
import { generateCRMMessage } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, MessageSquare, User as UserIcon, Trash2, Sparkles, MapPin, CreditCard, History, X, Search } from 'lucide-react';

export default function CRM({ user }: { user: User }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingAI, setLoadingAI] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'customers'), where('uid', '==', user.uid), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    });

    const qBudgets = query(collection(db, 'budgets'), where('uid', '==', user.uid));
    const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
    });

    const qLoans = query(collection(db, 'loans'), where('uid', '==', user.uid));
    const unsubscribeLoans = onSnapshot(qLoans, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    });

    return () => {
      unsubscribe();
      unsubscribeBudgets();
      unsubscribeLoans();
    };
  }, [user.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'customers'), {
      uid: user.uid,
      name,
      email,
      phone,
      cpf,
      address,
      notes,
      lastInteraction: new Date().toISOString()
    });
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCpf('');
    setAddress('');
    setNotes('');
  };

  const handleGenerateMessage = async (customer: Customer, action: 'convince' | 'thank') => {
    if (!customer.phone) {
      alert('Este cliente não possui um número de telefone cadastrado.');
      return;
    }

    setLoadingAI(`${customer.id}-${action}`);
    try {
      const customerBudgets = budgets.filter(b => b.customerId === customer.id);
      const customerLoans = loans.filter(l => l.customerId === customer.id);
      
      const msg = await generateCRMMessage(customer, action, { 
        budgets: customerBudgets, 
        loans: customerLoans 
      });
      
      if (msg) {
        let cleanPhone = customer.phone.replace(/\D/g, '');
        // Ensure country code is present (defaulting to 55 for Brazil if not specified)
        if (cleanPhone.length > 0 && cleanPhone.length <= 11) {
          cleanPhone = '55' + cleanPhone;
        }
        
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        const win = window.open(url, '_blank');
        if (!win) {
          // If popup is blocked, try direct location change as fallback
          window.location.href = url;
        }
      } else {
        alert('Não foi possível gerar a mensagem. Verifique sua conexão ou chave de API.');
      }
    } catch (error) {
      console.error("Error generating CRM message:", error);
      alert('Ocorreu um erro ao gerar a mensagem.');
    } finally {
      setLoadingAI(null);
    }
  };

  const getCustomerHistory = (customerId: string) => {
    const b = budgets.filter(b => b.customerId === customerId);
    const l = loans.filter(l => l.customerId === customerId);
    return { budgets: b, loans: l };
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 sm:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Relacionamento</h2>
          <p className="text-zinc-400 text-xs sm:text-sm">Gerencie sua base de clientes e histórico de vendas.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nome ou telefone..."
              className="input-saas pr-12 py-2.5 text-sm"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary py-3 sm:py-2.5">
            <Plus size={20} /> Novo Cliente
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredCustomers.map((c) => (
          <motion.div
            key={c.id}
            layout
            className="card-saas p-6 flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                  <UserIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white leading-tight">{c.name}</h3>
                  <p className="text-xs text-zinc-400">{c.phone}</p>
                </div>
              </div>
              <button onClick={() => c.id && deleteDoc(doc(db, 'customers', c.id))} className="text-zinc-600 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="space-y-2 mb-6 flex-1">
              {c.cpf && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <CreditCard size={14} /> {c.cpf}
                </div>
              )}
              {c.address && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <MapPin size={14} /> {c.address}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedCustomer(c)}
                className="btn-secondary w-full text-xs py-2"
              >
                <History size={14} /> Ver Histórico
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateMessage(c, 'convince')}
                  disabled={loadingAI !== null}
                  className={`flex-1 text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    loadingAI === `${c.id}-convince` 
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-wait' 
                      : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                  }`}
                >
                  {loadingAI === `${c.id}-convince` ? (
                    <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {loadingAI === `${c.id}-convince` ? 'Gerando...' : 'Convencer'}
                </button>
                <button
                  onClick={() => handleGenerateMessage(c, 'thank')}
                  disabled={loadingAI !== null}
                  className={`flex-1 text-[10px] font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    loadingAI === `${c.id}-thank` 
                      ? 'bg-zinc-800 text-zinc-500 cursor-wait' 
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {loadingAI === `${c.id}-thank` ? (
                    <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <MessageSquare size={14} />
                  )}
                  {loadingAI === `${c.id}-thank` ? 'Gerando...' : 'Agradecer'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto pt-10">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-zinc-900 w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-zinc-800"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
                <div>
                  <h3 className="text-xl font-bold text-white">Histórico: {selectedCustomer.name}</h3>
                  <p className="text-xs text-zinc-400">Todos os orçamentos e serviços realizados.</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4 no-scrollbar">
                {getCustomerHistory(selectedCustomer.id!).budgets.length > 0 || getCustomerHistory(selectedCustomer.id!).loans.length > 0 ? (
                  <>
                    {getCustomerHistory(selectedCustomer.id!).budgets.map(b => (
                      <div key={b.id} className="p-4 rounded-2xl border border-zinc-800 bg-zinc-800/50 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest mb-1">Serviço/Orçamento</p>
                          <p className="font-bold text-white">{b.title}</p>
                          <p className="text-xs text-zinc-500">{new Date(b.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-500">R$ {b.totalAmount.toLocaleString('pt-BR')}</p>
                          <span className={`text-[10px] font-bold uppercase ${b.status === 'approved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {getCustomerHistory(selectedCustomer.id!).loans.map(l => (
                      <div key={l.id} className="p-4 rounded-2xl border border-zinc-800 bg-amber-500/5 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mb-1">Empréstimo</p>
                          <p className="font-bold text-white">R$ {l.principal.toLocaleString('pt-BR')}</p>
                          <p className="text-xs text-zinc-500">{new Date(l.startDate).toLocaleDateString('pt-BR')} • {l.interestRate}% juros</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold uppercase ${l.status === 'active' ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {l.status === 'active' ? 'Ativo' : 'Pago'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-center text-zinc-500 py-10">Nenhum registro encontrado para este cliente.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Customer Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto pt-10">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-zinc-900 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl max-h-[95vh] overflow-y-auto no-scrollbar border border-zinc-800"
            >
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-zinc-900 z-10 pb-2">
                <h3 className="text-2xl font-bold text-white">Novo Cliente</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Nome Completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-saas" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">WhatsApp</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-saas" placeholder="5511999999999" required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">CPF</label>
                    <input type="text" value={cpf} onChange={(e) => setCpf(e.target.value)} className="input-saas" placeholder="000.000.000-00" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Endereço</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input-saas" placeholder="Rua, Número, Bairro, Cidade" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Observações</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-saas" rows={3} />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-lg">
                  Salvar Cliente
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

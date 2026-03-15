import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loan, Customer } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Calculator, Trash2, Percent, Landmark, X, ArrowRight, Search, ChevronRight, Edit2, DollarSign, CheckCircle2 } from 'lucide-react';

export default function Loans({ user }: { user: User }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState<Loan | null>(null);
  const [manageAmount, setManageAmount] = useState('');
  const [manageDate, setManageDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanTransactions, setLoanTransactions] = useState<any[]>([]);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Calculator state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [borrowerName, setBorrowerName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [type, setType] = useState<'interest_only' | 'principal_interest'>('interest_only');
  const [installments, setInstallments] = useState('');
  const [paymentDay, setPaymentDay] = useState('10');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'loans'), 
      where('uid', '==', user.uid), 
      where('status', '==', 'active'),
      orderBy('startDate', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Loan)));
    }, (error) => {
      console.error('Loans Snapshot Error:', error);
    });

    const qCust = query(collection(db, 'customers'), where('uid', '==', user.uid));
    const unsubscribeCust = onSnapshot(qCust, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
    }, (error) => {
      console.error('Customers Snapshot Error:', error);
    });

    return () => {
      unsubscribe();
      unsubscribeCust();
    };
  }, [user.uid]);

  useEffect(() => {
    if (showManageModal?.id) {
      const q = query(
        collection(db, 'transactions'),
        where('uid', '==', user.uid),
        where('loanId', '==', showManageModal.id),
        orderBy('date', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setLoanTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }, (error) => {
        console.error('Loan Transactions Snapshot Error:', error);
      });
      return () => unsubscribe();
    } else {
      setLoanTransactions([]);
    }
  }, [showManageModal]);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalCustomerId = customerId;
      let finalCustomerName = borrowerName || customerSearch;

      if (!finalCustomerName) {
        alert('Por favor, informe o nome do cliente.');
        setLoading(false);
        return;
      }

      // Grouping by phone logic
      if (!finalCustomerId && customerPhone) {
        const existingCustomer = customers.find(c => c.phone.replace(/\D/g, '') === customerPhone.replace(/\D/g, ''));
        if (existingCustomer) {
          finalCustomerId = existingCustomer.id!;
          finalCustomerName = existingCustomer.name;
        } else {
          // Create new customer if phone doesn't exist
          const docRef = await addDoc(collection(db, 'customers'), {
            uid: user.uid,
            name: finalCustomerName,
            phone: customerPhone,
            email: '',
            notes: 'Criado via Empréstimo',
            lastInteraction: new Date().toISOString()
          });
          finalCustomerId = docRef.id;
        }
      }

      const principalVal = parseFloat(principal);
      const interestRateVal = parseFloat(interestRate);

      if (isNaN(principalVal) || isNaN(interestRateVal)) {
        alert('Por favor, informe valores válidos para o principal e juros.');
        setLoading(false);
        return;
      }

      const loanData = {
        uid: user.uid,
        customerId: finalCustomerId || null,
        customerName: finalCustomerName,
        borrowerName: finalCustomerName,
        principal: principalVal,
        interestRate: interestRateVal,
        type,
        installments: installments ? parseInt(installments) : null,
        paymentDay: parseInt(paymentDay),
        startDate: startDate, // Store as YYYY-MM-DD string to avoid timezone shifts
        notes: notes || '',
        status: editingLoan?.status || 'active'
      };

      if (editingLoan?.id) {
        await updateDoc(doc(db, 'loans', editingLoan.id), loanData);
        alert('Empréstimo atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'loans'), {
          ...loanData,
          paidPrincipal: 0,
        });
        alert('Empréstimo criado com sucesso!');
      }
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error("Error saving loan:", error);
      alert('Erro ao salvar empréstimo. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (loan: Loan) => {
    setEditingLoan(loan);
    setCustomerId(loan.customerId || '');
    setCustomerSearch(loan.customerName);
    setBorrowerName(loan.borrowerName || loan.customerName);
    setPrincipal(loan.principal.toString());
    setInterestRate(loan.interestRate.toString());
    setType(loan.type);
    setInstallments(loan.installments?.toString() || '');
    setPaymentDay(loan.paymentDay?.toString() || '10');
    setStartDate(loan.startDate.split('T')[0]);
    setNotes(loan.notes || '');
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingLoan(null);
    setCustomerId('');
    setCustomerSearch('');
    setCustomerPhone('');
    setBorrowerName('');
    setPrincipal('');
    setInterestRate('');
    setInstallments('');
    setPaymentDay('10');
    setStartDate(new Date().toISOString().split('T')[0]);
    setNotes('');
  };

  const handlePayInterest = async (loan: Loan) => {
    try {
      const interestAmount = loan.principal * (loan.interestRate / 100);
      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        type: 'income',
        amount: interestAmount,
        description: `Juros Recebidos: ${loan.customerName}`,
        category: 'Empréstimo',
        date: manageDate, // Use YYYY-MM-DD directly
        loanId: loan.id
      });
      alert(`Recebimento de R$ ${interestAmount.toLocaleString('pt-BR')} (Juros) registrado!`);
      setShowManageModal(null);
      setManageDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error("Error paying interest:", error);
      alert('Erro ao registrar pagamento de juros.');
    }
  };

  const handlePayPrincipal = async (loan: Loan, amount: number) => {
    if (amount <= 0 || amount > loan.principal) {
      alert('Valor inválido.');
      return;
    }

    try {
      const newPrincipal = loan.principal - amount;
      const newPaidPrincipal = (loan.paidPrincipal || 0) + amount;
      const isFinished = newPrincipal <= 0;

      await updateDoc(doc(db, 'loans', loan.id!), {
        principal: newPrincipal,
        paidPrincipal: newPaidPrincipal,
        status: isFinished ? 'paid' : 'active'
      });

      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        type: 'income',
        amount: amount,
        description: `Amortização de Capital: ${loan.customerName}`,
        category: 'Empréstimo',
        date: manageDate, // Use YYYY-MM-DD directly
        loanId: loan.id
      });

      alert(`Recebimento de R$ ${amount.toLocaleString('pt-BR')} (Capital) registrado!`);
      setShowManageModal(null);
      setManageAmount('');
      setManageDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error("Error paying principal:", error);
      alert('Erro ao registrar amortização.');
    }
  };

  const handleFinishLoan = async (loan: Loan) => {
    if (window.confirm(`Deseja quitar o valor total de R$ ${loan.principal.toLocaleString('pt-BR')} e finalizar este contrato?`)) {
      try {
        const remainingAmount = loan.principal;
        
        await updateDoc(doc(db, 'loans', loan.id!), {
          principal: 0,
          paidPrincipal: (loan.paidPrincipal || 0) + remainingAmount,
          status: 'paid'
        });

        await addDoc(collection(db, 'transactions'), {
          uid: user.uid,
          type: 'income',
          amount: remainingAmount,
          description: `Quitação de Contrato: ${loan.customerName}`,
          category: 'Empréstimo',
          date: new Date().toISOString(),
          loanId: loan.id
        });

        alert('Contrato quitado com sucesso!');
        setShowManageModal(null);
      } catch (error) {
        console.error("Error finishing loan:", error);
        alert('Erro ao quitar contrato.');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  };

  const calculateMonthly = (p: number, r: number, t: 'interest_only' | 'principal_interest', inst?: number | null) => {
    const monthlyRate = r / 100;
    if (t === 'interest_only') {
      return p * monthlyRate;
    } else {
      const numInst = inst || 12;
      return (p * monthlyRate) + (p / numInst);
    }
  };

  const handlePayInstallment = async (loan: Loan) => {
    try {
      const monthlyAmount = calculateMonthly(loan.principal, loan.interestRate, loan.type, loan.installments);
      const interestAmount = loan.principal * (loan.interestRate / 100);
      const principalAmount = monthlyAmount - interestAmount;

      const newPrincipal = loan.principal - principalAmount;
      const newPaidPrincipal = (loan.paidPrincipal || 0) + principalAmount;
      const isFinished = newPrincipal <= 0;

      await updateDoc(doc(db, 'loans', loan.id!), {
        principal: newPrincipal,
        paidPrincipal: newPaidPrincipal,
        status: isFinished ? 'paid' : 'active'
      });

      await addDoc(collection(db, 'transactions'), {
        uid: user.uid,
        type: 'income',
        amount: monthlyAmount,
        description: `Parcela Recebida: ${loan.customerName} (Juros + Capital)`,
        category: 'Empréstimo',
        date: manageDate, // Use YYYY-MM-DD directly
        loanId: loan.id
      });

      alert(`Recebimento de R$ ${monthlyAmount.toLocaleString('pt-BR')} registrado!`);
      setShowManageModal(null);
      setManageDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error("Error paying installment:", error);
      alert('Erro ao registrar pagamento de parcela.');
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
                <div className={`w-14 h-14 ${l.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'} rounded-[1.25rem] flex items-center justify-center`}>
                  <Landmark size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">{l.customerName || l.borrowerName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      {l.type === 'interest_only' ? 'Apenas Juros' : 'Juros + Capital'}
                    </p>
                    {l.status === 'paid' && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Pago</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEdit(l)} className="p-2 text-zinc-600 hover:text-brand-500 transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => l.id && deleteDoc(doc(db, 'loans', l.id))} className="p-2 text-zinc-600 hover:text-rose-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
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
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Contratação</p>
                <p className="text-sm font-bold text-white">{formatDate(l.startDate)}</p>
              </div>
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Dia Pagamento</p>
                <p className="text-sm font-bold text-white">Dia {l.paymentDay || '-'}</p>
              </div>
            </div>

            {l.installments && (
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700">
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Parcelas</p>
                <p className="text-sm font-bold text-white">{l.installments}x</p>
              </div>
            )}

            <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-xl shadow-emerald-900/20 flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-emerald-100 text-[10px] uppercase font-bold tracking-widest mb-1">Pagamento Mensal</p>
                <p className="text-3xl font-bold">
                  R$ {calculateMonthly(l.principal, l.interestRate, l.type, l.installments).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <Percent className="text-white/10 absolute -right-4 -bottom-4" size={80} />
            </div>

            {l.status === 'active' && (
              <button 
                onClick={() => setShowManageModal(l)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl border border-zinc-700 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Edit2 size={18} className="text-emerald-500" />
                Gerenciar Pagamentos
              </button>
            )}

            {(l.paidPrincipal || 0) > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-zinc-500">Amortizado</span>
                  <span className="text-emerald-500">R$ {l.paidPrincipal?.toLocaleString('pt-BR')}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((l.paidPrincipal || 0) / (l.principal + (l.paidPrincipal || 0))) * 100)}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            )}
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
        {showManageModal && (
          <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto pt-10">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-zinc-900 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto no-scrollbar border border-zinc-800"
            >
              <div className="p-6 sm:p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">Gerenciar Empréstimo</h3>
                  <p className="text-xs text-zinc-400 mt-1">{showManageModal.customerName}</p>
                </div>
                <button onClick={() => setShowManageModal(null)} className="p-2 text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all">
                  <X size={28} />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-zinc-800 p-6 rounded-[2rem] border border-zinc-700">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-4">Data do Pagamento</p>
                    <input 
                      type="date"
                      value={manageDate}
                      onChange={(e) => setManageDate(e.target.value)}
                      className="input-saas"
                    />
                  </div>

                  <div className="bg-zinc-800 p-6 rounded-[2rem] border border-zinc-700">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-4">Resumo do Contrato</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Data Início:</span>
                        <span className="text-white font-bold">{formatDate(showManageModal.startDate)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Dia de Vencimento:</span>
                        <span className="text-white font-bold">Todo dia {showManageModal.paymentDay}</span>
                      </div>
                      {showManageModal.installments && (
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Total Parcelas:</span>
                          <span className="text-white font-bold">{showManageModal.installments}x</span>
                        </div>
                      )}
                      {showManageModal.notes && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Observações</p>
                          <p className="text-xs text-zinc-300 italic">{showManageModal.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={() => handlePayInstallment(showManageModal)}
                    className="flex items-center gap-4 p-5 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-[2rem] transition-all group border border-emerald-600/20"
                  >
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <DollarSign size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-500">Pagar Parcela Mensal</p>
                      <p className="text-xs text-emerald-600/70">Registra R$ {calculateMonthly(showManageModal.principal, showManageModal.interestRate, showManageModal.type, showManageModal.installments).toLocaleString('pt-BR')} (Juros + Capital).</p>
                    </div>
                  </button>

                  <button 
                    onClick={() => handlePayInterest(showManageModal)}
                    className="flex items-center gap-4 p-5 bg-zinc-800 hover:bg-zinc-700 rounded-[2rem] transition-all group border border-zinc-700"
                  >
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Percent size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-white">Pagar Apenas Juros</p>
                      <p className="text-xs text-zinc-400">Registra R$ {(showManageModal.principal * (showManageModal.interestRate / 100)).toLocaleString('pt-BR')} como entrada.</p>
                    </div>
                  </button>

                  <div className="bg-zinc-800 p-6 rounded-[2rem] space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                        <DollarSign size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-white">Pagar Capital</p>
                        <p className="text-xs text-zinc-400">Amortizar valor do principal.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="number"
                        value={manageAmount}
                        onChange={(e) => setManageAmount(e.target.value)}
                        className="input-saas py-3"
                        placeholder="Valor R$"
                      />
                      <button 
                        onClick={() => handlePayPrincipal(showManageModal, parseFloat(manageAmount))}
                        className="btn-primary px-6"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleFinishLoan(showManageModal)}
                    className="flex items-center gap-4 p-5 bg-emerald-600/10 hover:bg-emerald-600/20 rounded-[2rem] transition-all group border border-emerald-600/20"
                  >
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-500">Quitar Total do Contrato</p>
                      <p className="text-xs text-emerald-600/70">Marcar empréstimo como totalmente pago.</p>
                    </div>
                  </button>

                  {loanTransactions.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Histórico de Pagamentos</p>
                      <div className="space-y-2">
                        {loanTransactions.map((t) => (
                          <div key={t.id} className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700 flex justify-between items-center">
                            <div>
                              <p className="text-sm font-bold text-white">{t.description}</p>
                              <p className="text-[10px] text-zinc-500">{formatDate(t.date)}</p>
                            </div>
                            <p className="text-emerald-500 font-bold">R$ {t.amount.toLocaleString('pt-BR')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <h3 className="text-xl sm:text-2xl font-bold text-white">{editingLoan ? 'Editar Empréstimo' : 'Novo Empréstimo'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 text-zinc-500 hover:text-zinc-300 active:scale-90 transition-all">
                  <X size={28} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                <div className="relative">
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Vincular Cliente (CRM)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setBorrowerName(e.target.value);
                        setShowCustomerResults(true);
                      }}
                      onFocus={() => setShowCustomerResults(true)}
                      className="input-saas pr-12 py-3"
                      placeholder="Buscar cliente ou digitar nome..."
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
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
                                setCustomerPhone(c.phone);
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

                {!customerId && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Telefone do Devedor (Agrupamento)</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="input-saas"
                      placeholder="Ex: 5511999999999"
                      required
                    />
                  </div>
                )}

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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Data Contratação</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-saas"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Dia Vencimento</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={paymentDay}
                      onChange={(e) => setPaymentDay(e.target.value)}
                      className="input-saas"
                      placeholder="Ex: 10"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Tipo de Pagamento</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                      className="input-saas bg-zinc-800"
                    >
                      <option value="interest_only">Apenas Juros</option>
                      <option value="principal_interest">Juros + Capital</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Qtd. Parcelas (Opcional)</label>
                    <input
                      type="number"
                      value={installments}
                      onChange={(e) => setInstallments(e.target.value)}
                      className="input-saas"
                      placeholder="Ex: 12"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Observações</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="input-saas min-h-[100px] py-3"
                    placeholder="Detalhes adicionais do contrato..."
                  />
                </div>

                <button type="submit" disabled={loading} className="w-full btn-primary py-4 text-lg mt-4 disabled:opacity-50">
                  {loading ? 'Salvando...' : (editingLoan ? 'Atualizar Empréstimo' : 'Salvar Empréstimo')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

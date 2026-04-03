import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Check, 
  Zap, 
  Clock, 
  Users,
  Edit2,
  Trash2,
  ChevronLeft,
  Save,
  X
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency } from '../lib/utils';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface Plan {
  id?: string;
  name: string;
  price: number;
  type: 'package' | 'subscription';
  features: string[];
  color: string;
  popular?: boolean;
  hours?: number; // For packages
  active: boolean;
}

export const AdminPlans = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan>({
    name: '',
    price: 0,
    type: 'package',
    features: [],
    color: 'neon',
    popular: false,
    active: true
  });
  const [newFeature, setNewFeature] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'tenants', 'main-ct', 'plans'));
      const snapshot = await getDocs(q);
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan)));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'tenants/main-ct/plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { id, ...planData } = currentPlan;
      if (id) {
        await updateDoc(doc(db, 'tenants', 'main-ct', 'plans', id), planData);
      } else {
        await addDoc(collection(db, 'tenants', 'main-ct', 'plans'), {
          ...planData,
          tenantId: 'main-ct'
        });
      }
      setIsEditing(false);
      fetchPlans();
      alert('Plano salvo com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tenants/main-ct/plans');
      alert('Erro ao salvar plano.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este plano?')) {
      try {
        await deleteDoc(doc(db, 'tenants', 'main-ct', 'plans', id));
        fetchPlans();
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `tenants/main-ct/plans/${id}`);
      }
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setCurrentPlan({
        ...currentPlan,
        features: [...currentPlan.features, newFeature.trim()]
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setCurrentPlan({
      ...currentPlan,
      features: currentPlan.features.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="p-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-2 text-sm"
          >
            <ChevronLeft size={16} /> Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">PLANOS E ASSINATURAS</h1>
          <p className="text-gray-400">Crie pacotes de horas e planos mensais para fidelizar atletas.</p>
        </div>
        <button 
          onClick={() => {
            setCurrentPlan({
              name: '',
              price: 0,
              type: 'package',
              features: [],
              color: 'neon',
              popular: false,
              active: true
            });
            setIsEditing(true);
          }}
          className="px-6 py-3 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Plus size={20} /> Novo Plano
        </button>
      </header>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard className="max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{currentPlan.id ? 'Editar Plano' : 'Novo Plano'}</h2>
                <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-white">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Nome do Plano</label>
                  <input 
                    type="text" 
                    value={currentPlan.name}
                    onChange={e => setCurrentPlan({...currentPlan, name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                    placeholder="Ex: Mensal VIP"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Tipo</label>
                  <select 
                    value={currentPlan.type}
                    onChange={e => setCurrentPlan({...currentPlan, type: e.target.value as 'package' | 'subscription'})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                  >
                    <option value="package">Pacote de Horas</option>
                    <option value="subscription">Assinatura Mensal</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Preço (R$)</label>
                  <input 
                    type="number" 
                    value={currentPlan.price}
                    onChange={e => setCurrentPlan({...currentPlan, price: parseFloat(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                    placeholder="450"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Destaque</label>
                  <div className="flex items-center gap-2 h-[50px]">
                    <input 
                      type="checkbox" 
                      checked={currentPlan.popular}
                      onChange={e => setCurrentPlan({...currentPlan, popular: e.target.checked})}
                      className="w-5 h-5 accent-neon"
                    />
                    <span className="text-sm text-gray-300">Marcar como "Mais Popular"</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Status</label>
                  <div className="flex items-center gap-2 h-[50px]">
                    <input 
                      type="checkbox" 
                      checked={currentPlan.active}
                      onChange={e => setCurrentPlan({...currentPlan, active: e.target.checked})}
                      className="w-5 h-5 accent-neon"
                    />
                    <span className="text-sm text-gray-300">Plano Ativo (Visível para clientes)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm text-gray-400">Benefícios / Características</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newFeature}
                    onChange={e => setNewFeature(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addFeature()}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                    placeholder="Adicionar benefício..."
                  />
                  <button 
                    onClick={addFeature}
                    className="px-4 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentPlan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1 bg-neon/10 text-neon rounded-full text-sm">
                      {feature}
                      <button onClick={() => removeFeature(i)} className="hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2 glass border-white/10 hover:bg-white/5 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2"
                >
                  <Save size={18} /> Salvar Plano
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <GlassCard 
            key={plan.id} 
            className={cn(
              "relative flex flex-col h-full",
              plan.popular && "border-neon/50 ring-1 ring-neon/20"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-neon text-black text-[10px] font-black uppercase tracking-widest rounded-full neon-shadow">
                Mais Popular
              </div>
            )}

            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">{plan.type === 'package' ? 'Pacote de Horas' : 'Assinatura Mensal'}</div>
                <div className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest",
                  plan.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                )}>
                  {plan.active ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              <h3 className="text-2xl font-black mb-4">{plan.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{formatCurrency(plan.price)}</span>
                {plan.type === 'subscription' && <span className="text-gray-500 text-sm">/mês</span>}
              </div>
            </div>

            <div className="space-y-4 flex-1 mb-8">
              {plan.features.map((feature, j) => (
                <div key={j} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-5 h-5 rounded-full bg-neon/10 flex items-center justify-center text-neon shrink-0">
                    <Check size={12} />
                  </div>
                  {feature}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setCurrentPlan(plan);
                  setIsEditing(true);
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={16} /> Editar
              </button>
              <button 
                onClick={() => plan.id && handleDelete(plan.id)}
                className="p-3 glass border-white/10 hover:text-red-500 rounded-xl transition-all"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </GlassCard>
        ))}
        {plans.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-gray-500">
            Nenhum plano cadastrado.
          </div>
        )}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

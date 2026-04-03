import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Star, Shield } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency } from '../lib/utils';

interface Plan {
  id: string;
  name: string;
  price: number;
  type: 'monthly' | 'yearly';
  features: string[];
  popular?: boolean;
}

export const Plans = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const path = 'tenants/main-ct/plans';
      try {
        const q = query(collection(db, 'tenants', 'main-ct', 'plans'), where('active', '==', true));
        const snapshot = await getDocs(q);
        const plansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
        
        setPlans(plansData);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSubscribe = (plan: Plan) => {
    // In a real app, this would redirect to checkout
    alert(`Assinando plano ${plan.name}. Redirecionando para pagamento...`);
  };

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-black tracking-tighter neon-text">NOSSOS PLANOS</h1>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto">
          Escolha o plano que melhor se adapta ao seu ritmo e aproveite benefícios exclusivos no CTCrossBol Reserva.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon"></div>
        </div>
      ) : plans.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Star className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2">Nenhum plano disponível no momento</h3>
          <p className="text-gray-400">Fique atento! Em breve teremos novidades e planos exclusivos para você.</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard 
                className={`relative h-full flex flex-col p-8 border-2 transition-all duration-500 hover:scale-[1.02] ${
                  plan.popular ? 'border-neon bg-neon/5' : 'border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neon text-black text-[10px] font-black px-4 py-1 rounded-full neon-shadow uppercase tracking-widest">
                    Mais Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">{formatCurrency(plan.price)}</span>
                    <span className="text-gray-500 font-bold">/{plan.type === 'monthly' ? 'mês' : 'ano'}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 p-0.5 bg-neon/20 rounded-full">
                        <Check size={14} className="text-neon" />
                      </div>
                      <span className="text-gray-300 text-sm leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-4 rounded-2xl font-black transition-all duration-300 ${
                    plan.popular 
                      ? 'bg-neon text-black neon-shadow hover:shadow-[0_0_30px_rgba(57,255,20,0.4)]' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  ASSINAR AGORA
                </button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Benefits Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
        <div className="flex items-center gap-4 p-6 glass rounded-3xl border-white/5">
          <div className="p-3 bg-neon/10 rounded-2xl">
            <Zap className="text-neon" size={24} />
          </div>
          <div>
            <h4 className="font-bold">Reserva Prioritária</h4>
            <p className="text-xs text-gray-500">Acesso antecipado aos horários mais disputados.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-6 glass rounded-3xl border-white/5">
          <div className="p-3 bg-neon/10 rounded-2xl">
            <Star className="text-neon" size={24} />
          </div>
          <div>
            <h4 className="font-bold">Eventos Exclusivos</h4>
            <p className="text-xs text-gray-500">Convites para torneios e clínicas fechadas.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-6 glass rounded-3xl border-white/5">
          <div className="p-3 bg-neon/10 rounded-2xl">
            <Shield className="text-neon" size={24} />
          </div>
          <div>
            <h4 className="font-bold">Cancelamento Grátis</h4>
            <p className="text-xs text-gray-500">Flexibilidade total para mudar seus planos.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

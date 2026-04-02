import React from 'react';
import { motion } from 'motion/react';
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
  ChevronLeft
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency } from '../lib/utils';

export const AdminPlans = () => {
  const navigate = useNavigate();
  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-end">
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
        <button className="px-6 py-3 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus size={20} /> Novo Plano
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { 
            name: 'Pacote 10 Horas', 
            price: 900, 
            type: 'package', 
            features: ['Válido por 90 dias', 'Qualquer quadra', 'Horários flexíveis'],
            color: 'blue'
          },
          { 
            name: 'Mensal VIP', 
            price: 450, 
            type: 'subscription', 
            features: ['4 horas por mês', 'Reserva prioritária', '10% off em extras', 'Vestiário VIP'],
            color: 'neon',
            popular: true
          },
          { 
            name: 'Uso Ilimitado', 
            price: 1200, 
            type: 'subscription', 
            features: ['Jogue quando quiser', 'Horários off-peak', 'Convidado grátis (1x)', 'Cancelamento grátis'],
            color: 'purple'
          },
        ].map((plan, i) => (
          <GlassCard 
            key={i} 
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
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">{plan.type === 'package' ? 'Pacote de Horas' : 'Assinatura Mensal'}</div>
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
              <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                <Edit2 size={16} /> Editar
              </button>
              <button className="p-3 glass border-white/10 hover:text-red-500 rounded-xl transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

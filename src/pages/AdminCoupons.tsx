import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  XCircle,
  Percent,
  DollarSign,
  ChevronLeft
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency } from '../lib/utils';

export const AdminCoupons = () => {
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
          <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">CUPONS E PROMOÇÕES</h1>
          <p className="text-gray-400">Crie incentivos para seus atletas e aumente suas reservas.</p>
        </div>
        <button className="px-6 py-3 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2 hover:scale-105 transition-transform">
          <Plus size={20} /> Novo Cupom
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { code: 'VERAO20', type: 'percentage', value: 20, usage: '45/100', status: 'active', expiry: '2026-05-01' },
          { code: 'PRIMEIRA10', type: 'fixed', value: 10, usage: '128/∞', status: 'active', expiry: '2026-12-31' },
          { code: 'CARNAVAL', type: 'percentage', value: 50, usage: '50/50', status: 'expired', expiry: '2026-02-28' },
        ].map((coupon, i) => (
          <GlassCard key={i} className="relative group overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              {coupon.status === 'active' ? (
                <CheckCircle2 className="text-neon" size={20} />
              ) : (
                <XCircle className="text-red-500" size={20} />
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-neon/10 rounded-xl flex items-center justify-center text-neon">
                {coupon.type === 'percentage' ? <Percent size={24} /> : <DollarSign size={24} />}
              </div>
              <div>
                <div className="text-2xl font-black tracking-tighter text-white">{coupon.code}</div>
                <div className="text-xs text-gray-500 uppercase tracking-widest">
                  {coupon.type === 'percentage' ? `${coupon.value}% de desconto` : `${formatCurrency(coupon.value)} de desconto`}
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Uso</span>
                <span className="font-bold">{coupon.usage}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Validade</span>
                <span className="font-bold">{new Date(coupon.expiry).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-2 glass border-white/10 hover:bg-white/5 rounded-lg text-xs font-bold transition-all">
                Editar
              </button>
              <button className="p-2 glass border-white/10 hover:text-red-500 rounded-lg transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

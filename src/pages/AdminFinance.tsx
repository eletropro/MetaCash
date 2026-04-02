import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Filter,
  CreditCard,
  Smartphone,
  Banknote,
  ChevronLeft
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency } from '../lib/utils';

const revenueData = [
  { name: 'Jan', value: 4500 },
  { name: 'Fev', value: 5200 },
  { name: 'Mar', value: 4800 },
  { name: 'Abr', value: 6100 },
  { name: 'Mai', value: 5900 },
  { name: 'Jun', value: 7200 },
];

const paymentMethods = [
  { name: 'PIX', value: 65, color: '#00FF88' },
  { name: 'Cartão', value: 25, color: '#3B82F6' },
  { name: 'Dinheiro', value: 10, color: '#F59E0B' },
];

export const AdminFinance = () => {
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
          <h1 className="text-3xl font-black tracking-tighter neon-text">FINANCEIRO</h1>
          <p className="text-gray-400">Controle total de receitas, pagamentos e relatórios.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 glass border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold flex items-center gap-2">
            <Filter size={18} /> Filtrar
          </button>
          <button className="px-4 py-2 bg-neon text-black rounded-xl text-sm font-bold neon-shadow flex items-center gap-2">
            <Download size={18} /> Relatório PDF
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="bg-neon/5 border-neon/20">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-neon/10 rounded-xl text-neon">
              <DollarSign size={24} />
            </div>
            <div className="text-xs font-bold text-green-500 flex items-center gap-1">
              <ArrowUpRight size={12} /> +15.4%
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-1">Receita Mensal</div>
          <div className="text-3xl font-black tracking-tight">{formatCurrency(7200)}</div>
        </GlassCard>

        <GlassCard>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
              <CreditCard size={24} />
            </div>
            <div className="text-xs font-bold text-green-500 flex items-center gap-1">
              <ArrowUpRight size={12} /> +8.2%
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-1">Ticket Médio</div>
          <div className="text-3xl font-black tracking-tight">{formatCurrency(124.50)}</div>
        </GlassCard>

        <GlassCard>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
              <Smartphone size={24} />
            </div>
            <div className="text-xs font-bold text-red-500 flex items-center gap-1">
              <ArrowDownRight size={12} /> -2.1%
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-1">Pagamentos Pendentes</div>
          <div className="text-3xl font-black tracking-tight">{formatCurrency(840)}</div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 h-[400px]">
          <h3 className="text-xl font-bold mb-8">Evolução de Receita</h3>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ color: '#00FF88' }}
              />
              <Bar dataKey="value" fill="#00FF88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="h-[400px] flex flex-col">
          <h3 className="text-xl font-bold mb-4">Métodos de Pagamento</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethods}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {paymentMethods.map((method) => (
              <div key={method.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: method.color }} />
                  <span className="text-gray-400">{method.name}</span>
                </div>
                <span className="font-bold">{method.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-xl font-bold mb-6">Transações Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 text-sm">
                <th className="pb-4 font-medium">ID</th>
                <th className="pb-4 font-medium">Cliente</th>
                <th className="pb-4 font-medium">Método</th>
                <th className="pb-4 font-medium">Data</th>
                <th className="pb-4 font-medium">Valor</th>
                <th className="pb-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4 text-sm text-gray-400">#TRX-982{i}</td>
                  <td className="py-4 font-bold">Ricardo Oliveira</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Smartphone size={16} className="text-neon" /> PIX
                    </div>
                  </td>
                  <td className="py-4 text-sm text-gray-400">02/04/2026</td>
                  <td className="py-4 font-bold text-neon">{formatCurrency(120)}</td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-full">
                      Confirmado
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

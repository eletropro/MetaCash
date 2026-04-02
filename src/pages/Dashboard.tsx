import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  Calendar as CalendarIcon, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency } from '../lib/utils';

const data = [
  { name: 'Seg', revenue: 4000, bookings: 24 },
  { name: 'Ter', revenue: 3000, bookings: 18 },
  { name: 'Qua', revenue: 2000, bookings: 12 },
  { name: 'Qui', revenue: 2780, bookings: 15 },
  { name: 'Sex', revenue: 1890, bookings: 10 },
  { name: 'Sáb', revenue: 2390, bookings: 14 },
  { name: 'Dom', revenue: 3490, bookings: 21 },
];

export const Dashboard = () => {
  const stats = [
    { label: 'Faturamento Total', value: 'R$ 12.450,00', change: '+12.5%', icon: DollarSign, positive: true },
    { label: 'Novas Reservas', value: '142', change: '+8.2%', icon: CalendarIcon, positive: true },
    { label: 'Novos Clientes', value: '28', change: '-2.4%', icon: Users, positive: false },
    { label: 'Ticket Médio', value: 'R$ 85,00', change: '+5.1%', icon: TrendingUp, positive: true },
  ];

  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter neon-text">DASHBOARD</h1>
          <p className="text-gray-400">Bem-vindo de volta ao seu centro esportivo.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 glass border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold transition-all">
            Exportar PDF
          </button>
          <button className="px-4 py-2 bg-neon text-black rounded-xl text-sm font-bold neon-shadow hover:scale-105 transition-transform">
            Nova Reserva
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} className="relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-neon/10 rounded-xl text-neon group-hover:bg-neon group-hover:text-black transition-colors">
                <stat.icon size={24} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                stat.positive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {stat.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {stat.change}
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
            <div className="text-2xl font-black tracking-tight">{stat.value}</div>
          </GlassCard>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2 h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Receita Semanal</h3>
            <select className="bg-transparent border-none text-sm text-gray-400 outline-none cursor-pointer">
              <option>Últimos 7 dias</option>
              <option>Último mês</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ color: '#00FF88' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#00FF88" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard className="h-[400px]">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold">Reservas por Dia</h3>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #ffffff10', borderRadius: '12px' }}
                itemStyle={{ color: '#00FF88' }}
              />
              <Bar dataKey="bookings" fill="#00FF88" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      {/* Recent Activity */}
      <GlassCard>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Atividade Recente</h3>
          <button className="text-neon text-sm font-bold hover:underline">Ver todas</button>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold">
                  JS
                </div>
                <div>
                  <div className="font-bold">João Silva</div>
                  <div className="text-xs text-gray-500">Quadra 01 • Hoje às 18:00</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-bold text-neon">R$ 120,00</div>
                  <div className="text-[10px] uppercase tracking-widest text-green-500">Pago</div>
                </div>
                <button className="p-2 text-gray-500 hover:text-white transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

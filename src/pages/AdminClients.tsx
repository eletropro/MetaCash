import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar, 
  Star,
  Download,
  ChevronLeft
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export const AdminClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      setClients(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
      setLoading(false);
    };
    fetchClients();
  }, []);

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
          <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">CRM DE CLIENTES</h1>
          <p className="text-gray-400">Gerencie o histórico e a frequência dos seus atletas.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-neon transition-all"
            />
          </div>
          <button className="px-4 py-2 glass border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold flex items-center gap-2">
            <Download size={18} /> Exportar
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="flex items-center gap-4">
          <div className="p-4 bg-neon/10 rounded-2xl text-neon">
            <Users size={32} />
          </div>
          <div>
            <div className="text-sm text-gray-400">Total de Atletas</div>
            <div className="text-3xl font-black">1.240</div>
          </div>
        </GlassCard>
        
        <GlassCard className="flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
            <Star size={32} />
          </div>
          <div>
            <div className="text-sm text-gray-400">Atletas VIP</div>
            <div className="text-3xl font-black">42</div>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-4">
          <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-500">
            <Calendar size={32} />
          </div>
          <div>
            <div className="text-sm text-gray-400">Ativos este mês</div>
            <div className="text-3xl font-black">856</div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 text-sm">
                <th className="pb-4 font-medium">Cliente</th>
                <th className="pb-4 font-medium">Contato</th>
                <th className="pb-4 font-medium">Frequência</th>
                <th className="pb-4 font-medium">Última Reserva</th>
                <th className="pb-4 font-medium">Gasto Total</th>
                <th className="pb-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[1, 2, 3, 4, 5, 6].map((_, i) => (
                <tr key={i} className="group hover:bg-white/5 transition-colors">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-neon">
                        RL
                      </div>
                      <div>
                        <div className="font-bold">Rodrigo Lima</div>
                        <div className="text-xs text-gray-500">Membro desde Jan 2026</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Mail size={12} /> rodrigo@email.com
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Phone size={12} /> (11) 99999-9999
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} className={cn(s <= 4 ? "text-neon fill-neon" : "text-gray-600")} />
                      ))}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Alta Frequência</div>
                  </td>
                  <td className="py-4 text-sm text-gray-400">Ontem às 19:00</td>
                  <td className="py-4 font-bold text-neon">R$ 1.450,00</td>
                  <td className="py-4">
                    <button className="p-2 text-gray-500 hover:text-white transition-colors">
                      <MoreVertical size={20} />
                    </button>
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

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

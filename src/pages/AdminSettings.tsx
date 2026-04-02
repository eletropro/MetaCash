import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Globe, 
  Clock, 
  MapPin, 
  Camera, 
  Save, 
  Bell, 
  Shield, 
  Smartphone,
  MessageSquare,
  ChevronLeft
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

export const AdminSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'Geral', icon: Globe },
    { id: 'hours', label: 'Horários', icon: Clock },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'integrations', label: 'Integrações', icon: MessageSquare },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'tenants', 'main-ct'), {
        name: 'Crossbol Arena', // Pegar do estado em uma implementação real
        address: 'Av. Paulista, 1000 - São Paulo, SP',
        logo: 'https://picsum.photos/seed/sports/200/200',
        ownerId: auth.currentUser?.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <header>
        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-2 text-sm"
        >
          <ChevronLeft size={16} /> Voltar ao Dashboard
        </button>
        <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">CONFIGURAÇÕES</h1>
        <p className="text-gray-400">Personalize o seu centro esportivo e configure automações.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 space-y-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  activeTab === tab.id 
                    ? "bg-neon text-black neon-shadow font-bold" 
                    : "text-gray-400 hover:text-neon hover:bg-neon/10"
                )}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <GlassCard className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10 group-hover:border-neon transition-colors">
                        <Camera className="text-gray-500 group-hover:text-neon" size={32} />
                      </div>
                      <button className="absolute -bottom-2 -right-2 p-2 bg-neon text-black rounded-lg neon-shadow">
                        <Plus size={16} />
                      </button>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Logo do CT</h3>
                      <p className="text-sm text-gray-500">Recomendado: 512x512px (PNG ou SVG)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Nome do Centro Esportivo</label>
                      <input 
                        type="text" 
                        defaultValue="Crossbol Arena"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Website / Link Público</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">crossbol.com/</span>
                        <input 
                          type="text" 
                          defaultValue="arena-sp"
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm text-gray-400">Endereço Completo</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input 
                          type="text" 
                          defaultValue="Av. Paulista, 1000 - São Paulo, SP"
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-neon"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <div className="flex justify-end">
                  <button 
                    onClick={handleSave}
                    className="px-8 py-3 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2 hover:scale-105 transition-transform"
                  >
                    <Save size={20} /> Salvar Alterações
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'hours' && (
              <motion.div
                key="hours"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <GlassCard className="space-y-6">
                  <h3 className="text-xl font-bold">Horário de Funcionamento</h3>
                  <div className="space-y-4">
                    {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => (
                      <div key={day} className="flex items-center justify-between p-4 glass border-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                          <input type="checkbox" defaultChecked className="w-4 h-4 accent-neon" />
                          <span className="font-bold w-24">{day}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <input type="time" defaultValue="08:00" className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none" />
                          <span className="text-gray-500">até</span>
                          <input type="time" defaultValue="22:00" className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'integrations' && (
              <motion.div
                key="integrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassCard className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                        <MessageSquare size={24} />
                      </div>
                      <div className="px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-full">Conectado</div>
                    </div>
                    <h3 className="text-xl font-bold">WhatsApp Business</h3>
                    <p className="text-sm text-gray-400">Envie confirmações e lembretes automáticos para seus clientes.</p>
                    <button className="w-full py-2 glass border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold">Configurar Automações</button>
                  </GlassCard>

                  <GlassCard className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                        <Smartphone size={24} />
                      </div>
                      <div className="px-2 py-1 bg-gray-500/10 text-gray-500 text-[10px] font-bold uppercase rounded-full">Desconectado</div>
                    </div>
                    <h3 className="text-xl font-bold">Stripe Payments</h3>
                    <p className="text-sm text-gray-400">Aceite cartões de crédito e Apple/Google Pay de forma nativa.</p>
                    <button className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Conectar Conta</button>
                  </GlassCard>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

import { AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';

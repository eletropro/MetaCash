import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronLeft,
  Plus,
  Mail,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface SettingsData {
  name: string;
  address: string;
  website: string;
  logo: string;
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
      active: boolean;
    };
  };
}

export const AdminSettings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [settings, setSettings] = useState<SettingsData>({
    name: 'CTCrossBol Reserva',
    address: '',
    website: 'ct-crossbol',
    logo: '',
    openingHours: {
      'Segunda': { open: '08:00', close: '22:00', active: true },
      'Terça': { open: '08:00', close: '22:00', active: true },
      'Quarta': { open: '08:00', close: '22:00', active: true },
      'Quinta': { open: '08:00', close: '22:00', active: true },
      'Sexta': { open: '08:00', close: '22:00', active: true },
      'Sábado': { open: '08:00', close: '18:00', active: true },
      'Domingo': { open: '08:00', close: '12:00', active: true },
    }
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'tenants', 'main-ct');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SettingsData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'tenants/main-ct');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleResetDatabase = async () => {
    if (!window.confirm('ATENÇÃO: Esta ação irá apagar TODOS os clientes (exceto administradores), reservas e transações financeiras. Esta ação não pode ser desfeita. Deseja continuar?')) {
      return;
    }

    setResetting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete Bookings
      const bookingsSnap = await getDocs(collection(db, 'tenants', 'main-ct', 'bookings'));
      bookingsSnap.docs.forEach(doc => batch.delete(doc.ref));

      // 2. Delete Transactions
      const transactionsSnap = await getDocs(collection(db, 'tenants', 'main-ct', 'transactions'));
      transactionsSnap.docs.forEach(doc => batch.delete(doc.ref));

      // 3. Delete Users (except admins)
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.role !== 'admin' && userData.email !== 'duhgostozo@gmail.com') {
          batch.delete(doc.ref);
        }
      });

      await batch.commit();
      alert('Banco de dados resetado com sucesso! CRM e Financeiro agora estão zerados.');
      window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'database-reset');
      alert('Erro ao resetar banco de dados.');
    } finally {
      setResetting(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: Globe },
    { id: 'hours', label: 'Horários', icon: Clock },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'integrations', label: 'Integrações', icon: MessageSquare },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'tenants', 'main-ct'), {
        ...settings,
        ownerId: auth.currentUser?.uid,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'tenants/main-ct');
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const updateOpeningHour = (day: string, field: string, value: any) => {
    setSettings({
      ...settings,
      openingHours: {
        ...settings.openingHours,
        [day]: {
          ...settings.openingHours[day],
          [field]: value
        }
      }
    });
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
                      <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/10 group-hover:border-neon transition-colors overflow-hidden">
                        {settings.logo ? (
                          <img src={settings.logo} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="text-gray-500 group-hover:text-neon" size={32} />
                        )}
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
                        value={settings.name}
                        onChange={e => setSettings({...settings, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-gray-400">Website / Link Público</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">crossbol.com/</span>
                        <input 
                          type="text" 
                          value={settings.website}
                          onChange={e => setSettings({...settings, website: e.target.value})}
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
                          value={settings.address}
                          onChange={e => setSettings({...settings, address: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-neon"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <div className="flex justify-end">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="px-8 py-3 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
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
                    {Object.entries(settings.openingHours).map(([day, hours]: [string, any]) => (
                      <div key={day} className="flex items-center justify-between p-4 glass border-white/5 rounded-xl">
                        <div className="flex items-center gap-4">
                          <input 
                            type="checkbox" 
                            checked={hours.active}
                            onChange={e => updateOpeningHour(day, 'active', e.target.checked)}
                            className="w-4 h-4 accent-neon" 
                          />
                          <span className="font-bold w-24">{day}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <input 
                            type="time" 
                            value={hours.open}
                            onChange={e => updateOpeningHour(day, 'open', e.target.value)}
                            disabled={!hours.active}
                            className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none disabled:opacity-30" 
                          />
                          <span className="text-gray-500">até</span>
                          <input 
                            type="time" 
                            value={hours.close}
                            onChange={e => updateOpeningHour(day, 'close', e.target.value)}
                            disabled={!hours.active}
                            className="bg-white/5 border border-white/10 rounded-lg p-2 text-sm outline-none disabled:opacity-30" 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
                <div className="flex justify-end">
                  <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="px-8 py-3 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    <Save size={20} /> {loading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
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
                      <div className="px-2 py-1 bg-gray-500/10 text-gray-500 text-[10px] font-bold uppercase rounded-full">Desconectado</div>
                    </div>
                    <h3 className="text-xl font-bold">WhatsApp Business</h3>
                    <p className="text-sm text-gray-400">Envie confirmações e lembretes automáticos para seus clientes.</p>
                    <button className="w-full py-2 glass border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold">Conectar WhatsApp</button>
                  </GlassCard>

                  <GlassCard className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                        <Smartphone size={24} />
                      </div>
                      <div className="px-2 py-1 bg-gray-500/10 text-gray-500 text-[10px] font-bold uppercase rounded-full">Desconectado</div>
                    </div>
                    <h3 className="text-xl font-bold">Mercado Pago</h3>
                    <p className="text-sm text-gray-400">Aceite PIX e cartões de crédito de forma nativa.</p>
                    <button className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">Conectar Mercado Pago</button>
                  </GlassCard>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <GlassCard className="space-y-4">
                  <h3 className="text-xl font-bold">Segurança da Conta</h3>
                  <p className="text-sm text-gray-400">Configure permissões de acesso e segurança.</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 glass border-white/5 rounded-xl">
                      <div>
                        <div className="font-bold">Autenticação em Duas Etapas</div>
                        <div className="text-xs text-gray-500">Aumente a segurança do seu acesso administrativo.</div>
                      </div>
                      <button className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold">Ativar</button>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="border-red-500/20 bg-red-500/5 space-y-4">
                  <div className="flex items-center gap-3 text-red-500">
                    <AlertTriangle size={24} />
                    <h3 className="text-xl font-bold">Zona de Perigo</h3>
                  </div>
                  <p className="text-sm text-gray-400">Ações irreversíveis para gerenciar seus dados.</p>
                  <div className="p-4 glass border-red-500/10 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-red-500">Resetar Banco de Dados</div>
                      <div className="text-xs text-gray-500">Apaga todos os clientes, reservas e transações. Mantém apenas as configurações e quadras.</div>
                    </div>
                    <button 
                      onClick={handleResetDatabase}
                      disabled={resetting}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={18} /> {resetting ? 'Resetando...' : 'Resetar Agora'}
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <GlassCard className="space-y-4">
                  <h3 className="text-xl font-bold">Preferências de Notificação</h3>
                  <p className="text-sm text-gray-400">Escolha como você quer ser avisado sobre novas reservas.</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 glass border-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Mail size={20} className="text-gray-400" />
                        <span className="font-bold">E-mail</span>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-neon" />
                    </div>
                    <div className="flex items-center justify-between p-4 glass border-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Bell size={20} className="text-gray-400" />
                        <span className="font-bold">Push no Navegador</span>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5 accent-neon" />
                    </div>
                  </div>
                </GlassCard>
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

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Dribbble, Save, X, ChevronLeft, RotateCcw } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Court } from '../types';
import { formatCurrency } from '../lib/utils';

export const AdminCourts = () => {
  const navigate = useNavigate();
  const [courts, setCourts] = useState<Court[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCourt, setCurrentCourt] = useState<Partial<Court>>({
    name: '',
    description: '',
    basePrice: 0,
    active: true,
    images: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    const courtsSnapshot = await getDocs(collection(db, 'tenants', 'main-ct', 'courts'));
    setCourts(courtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Court)));
    setLoading(false);
  };

  const handleSave = async () => {
    try {
      if (currentCourt.id) {
        await updateDoc(doc(db, 'tenants', 'main-ct', 'courts', currentCourt.id), currentCourt);
      } else {
        await addDoc(collection(db, 'tenants', 'main-ct', 'courts'), {
          ...currentCourt,
          tenantId: 'main-ct'
        });
      }
      setIsEditing(false);
      fetchCourts();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir esta quadra?')) {
      await deleteDoc(doc(db, 'tenants', 'main-ct', 'courts', id));
      fetchCourts();
    }
  };

  const handleResetToDefaults = async () => {
    if (confirm('Deseja resetar todas as quadras para o valor de R$ 1,00 e descrição "Quadra de areia"? Isso afetará todas as quadras existentes.')) {
      setLoading(true);
      try {
        // Update existing courts or create new ones if none exist
        const defaultCourts = [
          { name: 'Quadra 1', description: 'Quadra de areia', basePrice: 1, active: true, images: [] },
          { name: 'Quadra 2', description: 'Quadra de areia', basePrice: 1, active: true, images: [] },
          { name: 'Quadra 3', description: 'Quadra de areia', basePrice: 1, active: true, images: [] },
        ];

        // Delete all current courts first to avoid duplicates if that's the intent of a "reset"
        for (const court of courts) {
          await deleteDoc(doc(db, 'tenants', 'main-ct', 'courts', court.id));
        }

        // Add new default courts
        for (const courtData of defaultCourts) {
          await addDoc(collection(db, 'tenants', 'main-ct', 'courts'), {
            ...courtData,
            tenantId: 'main-ct'
          });
        }

        alert('Quadras resetadas com sucesso!');
        fetchCourts();
      } catch (error) {
        console.error('Erro ao resetar quadras:', error);
        alert('Erro ao resetar quadras.');
      } finally {
        setLoading(false);
      }
    }
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
          <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">GESTÃO DE QUADRAS</h1>
          <p className="text-gray-400">Adicione, edite ou remova quadras do seu CT.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleResetToDefaults}
            className="px-6 py-3 glass border-white/10 text-gray-400 rounded-xl font-bold flex items-center gap-2 hover:text-white transition-colors"
          >
            <RotateCcw size={20} /> Resetar Padrões
          </button>
          <button 
            onClick={() => {
              setCurrentCourt({ name: '', description: '', basePrice: 0, active: true, images: [] });
              setIsEditing(true);
            }}
            className="px-6 py-3 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2 hover:scale-105 transition-transform"
          >
            <Plus size={20} /> Nova Quadra
          </button>
        </div>
      </header>

      {isEditing && (
        <GlassCard className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl font-bold">{currentCourt.id ? 'Editar Quadra' : 'Nova Quadra'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Nome da Quadra</label>
              <input 
                type="text" 
                value={currentCourt.name}
                onChange={e => setCurrentCourt({...currentCourt, name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                placeholder="Ex: Quadra 1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400">Preço por Hora (R$)</label>
              <input 
                type="number" 
                value={currentCourt.basePrice}
                onChange={e => setCurrentCourt({...currentCourt, basePrice: parseFloat(e.target.value)})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon"
                placeholder="120.00"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-gray-400">Descrição</label>
              <textarea 
                value={currentCourt.description}
                onChange={e => setCurrentCourt({...currentCourt, description: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 outline-none focus:border-neon h-24"
                placeholder="Descreva a quadra..."
              />
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
              className="px-6 py-2 bg-neon text-black rounded-xl font-bold neon-shadow"
            >
              Salvar Alterações
            </button>
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courts.map(court => (
          <GlassCard key={court.id} className="group">
            <div className="aspect-video bg-white/5 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
              <Dribbble size={48} className="text-white/10" />
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setCurrentCourt(court);
                    setIsEditing(true);
                  }}
                  className="p-2 glass border-white/10 hover:text-neon transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(court.id)}
                  className="p-2 glass border-white/10 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-1">{court.name}</h3>
            <p className="text-sm text-gray-400 mb-4 line-clamp-2">{court.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-neon font-black text-xl">{formatCurrency(court.basePrice)}/h</span>
              <div className={cn(
                "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                court.active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              )}>
                {court.active ? 'Ativa' : 'Inativa'}
              </div>
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

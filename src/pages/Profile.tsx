import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Save, LogOut, Building, User as UserIcon, Phone, MapPin, FileText, CheckCircle2 } from 'lucide-react';

export default function Profile({ user }: { user: User }) {
  const [profile, setProfile] = useState<UserProfile>({
    uid: user.uid,
    companyName: '',
    ownerName: '',
    email: user.email || '',
    phone: '',
    address: '',
    contractClauses: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user.uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await setDoc(doc(db, 'users', user.uid), profile);
    setSaving(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 sm:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Configurações</h2>
          <p className="text-zinc-500 text-xs sm:text-sm">Personalize sua empresa e documentos.</p>
        </div>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100"
          >
            <CheckCircle2 size={16} /> Salvo com sucesso!
          </motion.div>
        )}
      </header>

      <form onSubmit={handleSave} className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
          <div className="card-saas p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 text-brand-600 font-bold text-sm mb-2">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <Building size={20} />
              </div>
              Dados da Empresa
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Nome da Empresa</label>
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                  className="input-saas"
                  placeholder="Ex: Eletro Soluções"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Nome do Responsável</label>
                <input
                  type="text"
                  value={profile.ownerName}
                  onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                  className="input-saas"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
            </div>
          </div>

          <div className="card-saas p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 text-brand-600 font-bold text-sm mb-2">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                <Phone size={20} />
              </div>
              Contato e Localização
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">WhatsApp Business</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="input-saas py-3"
                  placeholder="5511999999999"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-widest">Endereço Fiscal</label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="input-saas py-3"
                  placeholder="Rua, Número, Bairro, Cidade"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card-saas p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-brand-600 font-bold text-sm mb-2">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <FileText size={20} />
            </div>
            Cláusulas e Termos do Contrato
          </div>
          <textarea
            value={profile.contractClauses}
            onChange={(e) => setProfile({ ...profile, contractClauses: e.target.value })}
            className="input-saas min-h-[200px] py-3"
            placeholder="Digite aqui as cláusulas que serão impressas nos seus contratos em PDF..."
          />
          <p className="text-[10px] text-zinc-400 italic">Essas cláusulas serão incluídas automaticamente na geração de contratos PDF.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 btn-primary py-4 sm:py-5 text-lg shadow-xl shadow-brand-500/20"
          >
            <Save size={22} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>

          <button
            type="button"
            onClick={() => auth.signOut()}
            className="w-full sm:w-48 bg-rose-50 text-rose-600 font-bold py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 active:scale-95 transition-all border border-rose-100"
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      </form>
    </div>
  );
}

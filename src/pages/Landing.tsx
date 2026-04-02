import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Dribbble, ArrowRight, Shield, Zap, Globe, Calendar } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Tenant } from '../types';

export const Landing = () => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        // Tenta buscar o tenant principal ou o primeiro disponível
        const tenantDoc = await getDoc(doc(db, 'tenants', 'main-ct'));
        if (tenantDoc.exists()) {
          setTenant({ id: tenantDoc.id, ...tenantDoc.data() } as Tenant);
        } else {
          const q = query(collection(db, 'tenants'), limit(1));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const firstTenant = querySnapshot.docs[0];
            setTenant({ id: firstTenant.id, ...firstTenant.data() } as Tenant);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar dados do CT:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTenant();
  }, []);

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-neon/10 blur-[120px] rounded-full -z-10" />
        
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-neon/20 text-neon text-sm font-medium mb-8"
          >
            <Zap size={16} />
            <span>{tenant?.name ? `Bem-vindo ao ${tenant.name}` : 'A Próxima Geração em Gestão Esportiva'}</span>
          </motion.div>

          {tenant?.logo && (
            <motion.img 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              src={tenant.logo} 
              alt="Logo CT" 
              className="w-32 h-32 mx-auto mb-8 rounded-2xl neon-shadow object-cover"
              referrerPolicy="no-referrer"
            />
          )}

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-none uppercase"
          >
            {tenant?.name || 'CROSSBOL'} <br />
            <span className="text-neon neon-text">MANAGER</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-400 max-w-2xl mx-auto mb-12"
          >
            {tenant?.address ? `Localizado em: ${tenant.address}` : 'Gestão profissional de quadras, reservas em tempo real e pagamentos automáticos.'}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="px-8 py-4 bg-neon text-black font-bold rounded-2xl flex items-center gap-2 hover:scale-105 transition-transform neon-shadow"
            >
              Começar Agora <ArrowRight size={20} />
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 glass border-white/10 hover:bg-white/5 rounded-2xl font-bold transition-all"
            >
              Ver Agenda
            </Link>
          </motion.div>
        </div>
      </section>
      {/* ... rest of the component remains the same ... */}

      {/* Features Grid */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="flex flex-col gap-4">
            <div className="w-12 h-12 bg-neon/10 rounded-xl flex items-center justify-center text-neon">
              <Calendar size={24} />
            </div>
            <h3 className="text-xl font-bold">Agenda Inteligente</h3>
            <p className="text-gray-400">Visualização avançada com drag & drop e sincronização em tempo real para evitar double booking.</p>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <div className="w-12 h-12 bg-neon/10 rounded-xl flex items-center justify-center text-neon">
              <Globe size={24} />
            </div>
            <h3 className="text-xl font-bold">Multi-tenant SaaS</h3>
            <p className="text-gray-400">Cada CT tem seu próprio ambiente isolado, com logo, cores e configurações personalizadas.</p>
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <div className="w-12 h-12 bg-neon/10 rounded-xl flex items-center justify-center text-neon">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold">Pagamentos Seguros</h3>
            <p className="text-gray-400">Integração nativa com PIX e Cartão de Crédito. Confirmação automática via Webhook.</p>
          </GlassCard>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-neon/5 border-y border-neon/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl font-black text-neon mb-2">99.9%</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">Uptime</div>
          </div>
          <div>
            <div className="text-4xl font-black text-neon mb-2">10k+</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">Reservas/mês</div>
          </div>
          <div>
            <div className="text-4xl font-black text-neon mb-2">50+</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">CTs Ativos</div>
          </div>
          <div>
            <div className="text-4xl font-black text-neon mb-2">24/7</div>
            <div className="text-gray-400 text-sm uppercase tracking-widest">Suporte</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neon rounded-lg flex items-center justify-center">
              <Dribbble className="text-black" size={18} />
            </div>
            <span className="font-bold tracking-tighter">CROSSBOL MANAGER</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400">
            <a href="#" className="hover:text-neon transition-colors">Termos</a>
            <a href="#" className="hover:text-neon transition-colors">Privacidade</a>
            <a href="#" className="hover:text-neon transition-colors">Contato</a>
          </div>
          <div className="text-sm text-gray-500">
            © 2026 Crossbol Manager. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

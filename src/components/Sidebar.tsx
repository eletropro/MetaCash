import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Dribbble, 
  Users, 
  DollarSign, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Ticket,
  Package
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SidebarProps {
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isAdmin }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const adminLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/calendar', icon: Calendar, label: 'Agenda' },
    { to: '/admin/courts', icon: Dribbble, label: 'Quadras' },
    { to: '/admin/clients', icon: Users, label: 'Clientes' },
    { to: '/admin/finance', icon: DollarSign, label: 'Financeiro' },
    { to: '/admin/coupons', icon: Ticket, label: 'Cupons' },
    { to: '/admin/plans', icon: Package, label: 'Planos' },
    { to: '/admin/settings', icon: Settings, label: 'Configurações' },
  ];

  const clientLinks = [
    { to: '/booking', icon: Calendar, label: 'Reservar' },
    { to: '/history', icon: LayoutDashboard, label: 'Minhas Reservas' },
  ];

  const links = isAdmin ? adminLinks : clientLinks;

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass text-neon"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(isOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "fixed inset-y-0 left-0 z-40 w-64 glass border-r-0 rounded-none lg:relative lg:flex flex-col",
              !isOpen && "hidden lg:flex"
            )}
          >
            <div className="p-8 flex items-center gap-3">
              <div className="w-10 h-10 bg-neon rounded-xl flex items-center justify-center neon-shadow">
                <Dribbble className="text-black" size={24} />
              </div>
              <h1 className="text-xl font-bold tracking-tighter neon-text">
                CROSSBOL<span className="text-neon">.</span>
              </h1>
            </div>

            <nav className="flex-1 px-4 space-y-2">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to;
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? "bg-neon text-black neon-shadow" 
                        : "text-gray-400 hover:text-neon hover:bg-neon/10"
                    )}
                  >
                    <Icon size={20} className={cn(isActive ? "text-black" : "group-hover:text-neon")} />
                    <span className="font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 mt-auto">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-500/10 transition-all duration-200"
              >
                <LogOut size={20} />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

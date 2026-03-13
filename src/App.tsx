import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebase';
import { 
  Home as HomeIcon, 
  DollarSign, 
  FileText, 
  Users, 
  Calculator, 
  User as UserIcon,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import Home from './pages/Home';
import Finance from './pages/Finance';
import Budgets from './pages/Budgets';
import CRM from './pages/CRM';
import Loans from './pages/Loans';
import Profile from './pages/Profile';
import Login from './pages/Login';

function Layout({ children, user }: { children: React.ReactNode; user: User }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Dashboard' },
    { path: '/finance', icon: DollarSign, label: 'Financeiro' },
    { path: '/budgets', icon: FileText, label: 'Orçamentos' },
    { path: '/crm', icon: Users, label: 'CRM' },
    { path: '/loans', icon: Calculator, label: 'Empréstimos' },
    { path: '/profile', icon: UserIcon, label: 'Configurações' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-zinc-100 sticky top-0 h-screen z-40">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
            <Zap size={24} fill="currentColor" />
          </div>
          <h1 className="font-black text-2xl text-zinc-900 tracking-tight">MetaCash</h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-brand-50 text-brand-600 shadow-sm' 
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} className={isActive ? 'text-brand-600' : 'text-zinc-400 group-hover:text-zinc-600'} />
                  <span className="font-bold text-sm">{item.label}</span>
                </div>
                {isActive && <ChevronRight size={14} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-50">
          <div className="bg-zinc-50 rounded-2xl p-4 flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-white rounded-xl border border-zinc-100 flex items-center justify-center text-zinc-400">
              <UserIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-900 truncate">{user.email?.split('@')[0]}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-rose-600 font-bold text-sm hover:bg-rose-50 transition-all"
          >
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white/80 backdrop-blur-lg border-b border-zinc-100 p-4 flex justify-between items-center sticky top-0 z-50 safe-top">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-100">
              <Zap size={20} fill="currentColor" />
            </div>
            <h1 className="font-black text-xl text-zinc-900 tracking-tight">MetaCash</h1>
          </div>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-zinc-600 bg-zinc-50 rounded-xl active:scale-95 transition-all">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 bg-white z-40 pt-24 px-6 lg:hidden"
            >
              <nav className="flex flex-col gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-4 p-5 rounded-2xl text-lg font-bold transition-all active:scale-[0.98] ${
                      location.pathname === item.path 
                        ? 'bg-brand-50 text-brand-600' 
                        : 'text-zinc-500 bg-zinc-50'
                    }`}
                  >
                    <item.icon size={24} />
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => auth.signOut()}
                  className="flex items-center gap-4 p-5 rounded-2xl text-lg font-bold text-rose-600 bg-rose-50 mt-4 active:scale-[0.98] transition-all"
                >
                  <LogOut size={24} />
                  Sair da Conta
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-5 lg:p-10 max-w-7xl mx-auto w-full pb-28 lg:pb-10">
          {children}
        </main>

        {/* Bottom Navigation (Mobile Only) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-zinc-100 flex justify-around p-3 pb-8 z-30 safe-bottom">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all active:scale-90 ${
                  isActive ? 'text-brand-600' : 'text-zinc-400'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? 'bg-brand-50' : ''}`}>
                  <item.icon size={22} />
                </div>
                <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-brand-100 animate-pulse">
            <Zap size={32} fill="currentColor" />
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-brand-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route
          path="/*"
          element={
            user ? (
              <Layout user={user}>
                <Routes>
                  <Route path="/" element={<Home user={user} />} />
                  <Route path="/finance" element={<Finance user={user} />} />
                  <Route path="/budgets" element={<Budgets user={user} />} />
                  <Route path="/crm" element={<CRM user={user} />} />
                  <Route path="/loans" element={<Loans user={user} />} />
                  <Route path="/profile" element={<Profile user={user} />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

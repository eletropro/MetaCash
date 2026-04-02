import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile } from './types';
import { Sidebar } from './components/Sidebar';
import { motion, AnimatePresence } from 'motion/react';

// Real Pages
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { BookingPage as Booking } from './pages/Booking';
import { AdminCourts } from './pages/AdminCourts';
import { AdminFinance } from './pages/AdminFinance';
import { AdminCalendar } from './pages/AdminCalendar';
import { AdminClients } from './pages/AdminClients';
import { AdminSettings } from './pages/AdminSettings';
import { AdminCoupons } from './pages/AdminCoupons';
import { AdminPlans } from './pages/AdminPlans';
import { History } from './pages/History';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser(userDoc.data() as UserProfile);
        } else {
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'Usuário',
            role: 'client',
            createdAt: new Date().toISOString()
          };
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 border-4 border-neon border-t-transparent rounded-full neon-shadow"
        />
      </div>
    );
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-black text-white overflow-x-hidden">
        {user && <Sidebar isAdmin={user.role === 'admin'} />}
        
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/dashboard' : '/booking'} /> : <Login />} />
              
              {/* Admin Routes */}
              <Route 
                path="/dashboard" 
                element={user?.role === 'admin' ? <Dashboard /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/admin/courts" 
                element={user?.role === 'admin' ? <AdminCourts /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/admin/finance" 
                element={user?.role === 'admin' ? <AdminFinance /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/admin/calendar" 
                element={user?.role === 'admin' ? <AdminCalendar /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/admin/clients" 
                element={user?.role === 'admin' ? <AdminClients /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/admin/settings" 
                element={user?.role === 'admin' ? <AdminSettings /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/admin/coupons" 
                element={user?.role === 'admin' ? <AdminCoupons /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/admin/plans" 
                element={user?.role === 'admin' ? <AdminPlans /> : <Navigate to="/login" />} 
              />
              
              {/* Client Routes */}
              <Route 
                path="/booking" 
                element={user ? <Booking /> : <Navigate to="/login" />} 
              />
              
              <Route 
                path="/history" 
                element={user ? <History /> : <Navigate to="/login" />} 
              />
              
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </Router>
  );
}

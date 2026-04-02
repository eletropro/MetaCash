import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Dribbble,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Court } from '../types';
import { formatTime, cn } from '../lib/utils';

export const AdminCalendar = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    // Real-time listener for bookings
    const q = query(collection(db, 'tenants', 'main-ct', 'bookings'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });

    // Fetch courts
    getDocs(collection(db, 'tenants', 'main-ct', 'courts')).then(snapshot => {
      setCourts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Court)));
    });

    return () => unsubscribe();
  }, []);

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 to 22:00

  return (
    <div className="p-8 space-y-8 h-screen flex flex-col">
      <header className="flex justify-between items-end">
        <div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-2 text-sm"
          >
            <ChevronLeft size={16} /> Voltar ao Dashboard
          </button>
          <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">AGENDA INTELIGENTE</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 glass px-3 py-1 rounded-lg">
              <button 
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(selectedDate.getDate() - 1);
                  setSelectedDate(newDate);
                }} 
                className="hover:text-neon"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold">{selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</span>
              <button 
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(selectedDate.getDate() + 1);
                  setSelectedDate(newDate);
                }} 
                className="hover:text-neon"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button 
              onClick={() => setSelectedDate(new Date())}
              className="text-sm text-neon font-bold hover:underline"
            >
              Hoje
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Buscar reserva..." 
              className="bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:border-neon transition-all"
            />
          </div>
          <button className="p-2 glass border-white/10 hover:text-neon transition-colors">
            <Filter size={20} />
          </button>
          <button className="px-6 py-2 bg-neon text-black rounded-xl font-bold neon-shadow flex items-center gap-2">
            <Plus size={20} /> Nova Reserva
          </button>
        </div>
      </header>

      {/* Calendar Grid */}
      <GlassCard className="flex-1 overflow-hidden flex flex-col p-0 border-white/5">
        <div className="flex border-b border-white/10">
          <div className="w-20 border-r border-white/10 p-4 shrink-0"></div>
          <div className="flex-1 flex overflow-x-auto">
            {courts.map(court => (
              <div key={court.id} className="flex-1 min-w-[200px] p-4 text-center border-r border-white/10 last:border-r-0">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Quadra</div>
                <div className="font-bold">{court.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {hours.map(hour => (
            <div key={hour} className="flex border-b border-white/5 group min-h-[80px]">
              <div className="w-20 border-r border-white/10 p-4 shrink-0 text-xs text-gray-500 font-mono flex flex-col justify-between">
                <span>{hour}:00</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{hour}:30</span>
              </div>
              <div className="flex-1 flex overflow-x-auto">
                {courts.map(court => {
                  const booking = bookings.find(b => {
                    const bDate = new Date(b.startTime);
                    return b.courtId === court.id && 
                           bDate.getHours() === hour && 
                           bDate.getDate() === selectedDate.getDate();
                  });

                  return (
                    <div key={court.id} className="flex-1 min-w-[200px] border-r border-white/5 last:border-r-0 p-1 relative group/cell hover:bg-neon/5 transition-colors cursor-pointer">
                      {booking ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "absolute inset-1 rounded-lg p-3 flex flex-col justify-between border-l-4 neon-shadow",
                            booking.status === 'paid' ? "bg-neon/10 border-neon" : "bg-blue-500/10 border-blue-500"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="text-xs font-bold truncate">{booking.userName}</div>
                            <button className="text-gray-500 hover:text-white"><MoreVertical size={14} /></button>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock size={10} /> {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </div>
                        </motion.div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-opacity">
                          <Plus size={20} className="text-neon/30" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

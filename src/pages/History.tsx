import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  Dribbble, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ChevronRight,
  MoreVertical
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency, formatDate, formatTime } from '../lib/utils';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Booking } from '../types';
import { AnimatePresence } from 'motion/react';
import { X, Copy, Smartphone } from 'lucide-react';

export const History = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'tenants', 'main-ct', 'bookings'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const copyToClipboard = (text: string) => {
    const handleSuccess = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(handleSuccess).catch(() => {
        fallbackCopyTextToClipboard(text, handleSuccess);
      });
    } else {
      fallbackCopyTextToClipboard(text, handleSuccess);
    }
  };

  const fallbackCopyTextToClipboard = (text: string, callback: () => void) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) callback();
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
    document.body.removeChild(textArea);
  };

  const checkPaymentStatus = async (booking: Booking) => {
    if (!booking.mercadopagoPaymentId) return;
    
    setCheckingStatus(true);
    try {
      const response = await fetch(`/api/payments/mercadopago/${booking.mercadopagoPaymentId}/status`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'approved') {
          setStatusMessage('Pagamento aprovado com sucesso!');
          setTimeout(() => setSelectedBooking(null), 2000);
        } else {
          setStatusMessage('Pagamento ainda não identificado. Por favor, aguarde alguns instantes.');
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status:", error);
      setStatusMessage('Erro ao verificar status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'tenants', 'main-ct', 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: 'cancelled'
      });
      setStatusMessage('Reserva cancelada com sucesso!');
      setConfirmCancel(false);
      setTimeout(() => setSelectedBooking(null), 2000);
    } catch (error) {
      console.error("Erro ao cancelar reserva:", error);
      setStatusMessage('Erro ao cancelar reserva.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto">
      <header>
        <h1 className="text-3xl font-black tracking-tighter neon-text uppercase">MINHAS RESERVAS</h1>
        <p className="text-gray-400">Acompanhe seu histórico e status de pagamento.</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-neon border-t-transparent rounded-full"
          />
        </div>
      ) : bookings.length === 0 ? (
        <GlassCard className="text-center py-20">
          <Calendar className="mx-auto text-gray-600 mb-4" size={48} />
          <h3 className="text-xl font-bold mb-2">Nenhuma reserva encontrada</h3>
          <p className="text-gray-400 mb-8">Você ainda não realizou nenhuma reserva em nosso CT.</p>
          <button className="px-8 py-3 bg-neon text-black rounded-xl font-bold neon-shadow">
            Fazer Minha Primeira Reserva
          </button>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, i) => (
            <GlassCard key={i} className="flex flex-col md:flex-row items-center justify-between gap-6 group">
              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-16 h-16 bg-neon/10 rounded-2xl flex items-center justify-center text-neon shrink-0">
                  <Dribbble size={32} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Quadra 01 - Society</div>
                  <div className="font-bold text-lg">{formatDate(booking.startTime)}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock size={14} /> {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto md:gap-12">
                <div className="text-right">
                  <div className="text-xl font-black text-white">{formatCurrency(booking.totalPrice)}</div>
                  <div className={cn(
                    "text-[10px] font-bold uppercase tracking-widest flex items-center justify-end gap-1",
                    booking.status === 'confirmed' ? "text-green-500" : 
                    booking.status === 'cancelled' ? "text-red-500" : "text-blue-500"
                  )}>
                    {booking.status === 'confirmed' ? <CheckCircle2 size={10} /> : 
                     booking.status === 'cancelled' ? <XCircle size={10} /> : <AlertCircle size={10} />}
                    {booking.status === 'confirmed' ? 'Confirmado' : 
                     booking.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedBooking(booking)}
                  className="p-3 glass border-white/10 hover:text-neon transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md glass p-8 relative"
            >
              <button 
                onClick={() => setSelectedBooking(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X size={24} />
              </button>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-black tracking-tighter neon-text mb-2">DETALHES DA RESERVA</h3>
                <p className="text-gray-400 text-sm">Status: <span className="text-neon uppercase font-bold">{selectedBooking.status}</span></p>
              </div>

              <div className="space-y-6">
                {selectedBooking.status === 'pending' && (
                  <div className="p-6 bg-neon/5 border border-neon/20 rounded-2xl flex flex-col items-center gap-4">
                    <div className="w-40 h-40 bg-white p-2 rounded-xl flex items-center justify-center">
                      {selectedBooking.pixQrCodeBase64 ? (
                        <img 
                          src={selectedBooking.pixQrCodeBase64.startsWith('data:') ? selectedBooking.pixQrCodeBase64 : `data:image/png;base64,${selectedBooking.pixQrCodeBase64}`} 
                          alt="QR Code PIX"
                          className="w-full h-full"
                        />
                      ) : (
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedBooking.pixCopyPaste || '')}`} 
                          alt="QR Code PIX Fallback"
                          className="w-full h-full opacity-50"
                        />
                      )}
                    </div>
                    <div className="w-full space-y-2">
                      <p className="text-[10px] text-gray-500 uppercase text-center tracking-widest">Clique abaixo para copiar o código PIX</p>
                      <button 
                        onClick={() => copyToClipboard(selectedBooking.pixCopyPaste || '')}
                        className={cn(
                          "w-full py-3 glass border-white/10 flex items-center justify-center gap-2 text-xs font-bold transition-all",
                          copied ? "bg-green-500 text-white" : "hover:bg-neon hover:text-black"
                        )}
                      >
                        {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} 
                        {copied ? 'Copiado!' : 'Copiar Código PIX'}
                      </button>
                      <button 
                        onClick={() => checkPaymentStatus(selectedBooking)}
                        disabled={checkingStatus}
                        className="w-full py-3 bg-neon text-black flex items-center justify-center gap-2 text-xs font-bold transition-all rounded-lg mt-2"
                      >
                        {checkingStatus ? 'Verificando...' : 'Já realizei o pagamento'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Data e Hora</span>
                    <span className="font-bold">{formatDate(selectedBooking.startTime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Valor Total</span>
                    <span className="font-bold text-neon">{formatCurrency(selectedBooking.totalPrice)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {statusMessage && (
                    <div className={cn(
                      "p-3 rounded-lg text-xs font-bold text-center",
                      statusMessage.includes('sucesso') ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    )}>
                      {statusMessage}
                    </div>
                  )}

                  {selectedBooking.status !== 'cancelled' && (
                    <>
                      {confirmCancel ? (
                        <div className="flex flex-col gap-2 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                          <p className="text-xs text-center text-red-500 font-bold mb-2">Tem certeza que deseja cancelar?</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleCancelBooking(selectedBooking.id)}
                              className="flex-1 py-2 bg-red-500 text-white rounded-lg text-xs font-bold"
                            >
                              Sim, Cancelar
                            </button>
                            <button 
                              onClick={() => setConfirmCancel(false)}
                              className="flex-1 py-2 glass border-white/10 rounded-lg text-xs font-bold"
                            >
                              Não
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmCancel(true)}
                          className="w-full py-4 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all"
                        >
                          Cancelar Reserva
                        </button>
                      )}
                    </>
                  )}
                  
                  <button 
                    onClick={() => {
                      setSelectedBooking(null);
                      setConfirmCancel(false);
                    }}
                    className="w-full py-4 glass border-white/10 hover:bg-white/5 rounded-xl font-bold transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

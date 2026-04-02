import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Dribbble, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  CheckCircle2,
  DollarSign,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from '../components/GlassCard';
import { formatCurrency, formatDate, formatTime, cn } from '../lib/utils';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Court, Booking } from '../types';

export const BookingPage = () => {
  const navigate = useNavigate();
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [duration, setDuration] = useState(1);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Court, 2: Time, 3: Payment
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [pixData, setPixData] = useState<{ id: string, copyPaste: string, qrCodeBase64: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);

  // Reset payment data when selection changes
  useEffect(() => {
    setPixData(null);
    setBookingId(null);
    setPaymentStatus(null);
  }, [selectedCourt, selectedDate, selectedTime, duration]);

  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  useEffect(() => {
    const fetchCourts = async () => {
      // For demo, we'll use a hardcoded tenantId or fetch the first one
      const courtsSnapshot = await getDocs(collection(db, 'tenants', 'main-ct', 'courts'));
      const courtsData = courtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Court));
      
      if (courtsData.length === 0) {
        // Seed some data if empty
        setCourts([
          { id: '1', tenantId: 'main-ct', name: 'Quadra 1', description: 'Quadra de areia', basePrice: 1, images: [], active: true },
          { id: '2', tenantId: 'main-ct', name: 'Quadra 2', description: 'Quadra de areia', basePrice: 1, images: [], active: true },
          { id: '3', tenantId: 'main-ct', name: 'Quadra 3', description: 'Quadra de areia', basePrice: 1, images: [], active: true },
        ]);
      } else {
        setCourts(courtsData);
      }
      setLoading(false);
    };

    fetchCourts();
  }, []);

  useEffect(() => {
    if (selectedCourt && selectedDate) {
      const fetchExistingBookings = async () => {
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const q = query(
          collection(db, 'tenants', 'main-ct', 'bookings'),
          where('courtId', '==', selectedCourt.id),
          where('startTime', '>=', startOfDay.toISOString()),
          where('startTime', '<=', endOfDay.toISOString())
        );

        const snapshot = await getDocs(q);
        setExistingBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      };
      fetchExistingBookings();
    }
  }, [selectedCourt, selectedDate]);

  useEffect(() => {
    if (step === 3 && selectedCourt && selectedTime && !pixData) {
      const createPayment = async () => {
        setLoading(true);
        try {
          // 1. Create the booking in Firestore FIRST with status 'pending'
          const startTime = new Date(selectedDate);
          const [hours, minutes] = selectedTime.split(':');
          startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + Math.floor(duration));
          if (duration % 1 !== 0) {
            endTime.setMinutes(startTime.getMinutes() + 30);
          }

          const totalPrice = Number((selectedCourt.basePrice * duration).toFixed(2));
          console.log(`Calculated Total Price: ${totalPrice} (Base: ${selectedCourt.basePrice}, Duration: ${duration})`);

          const docRef = await addDoc(collection(db, 'tenants', 'main-ct', 'bookings'), {
            tenantId: 'main-ct',
            courtId: selectedCourt.id,
            userId: auth.currentUser?.uid,
            userName: auth.currentUser?.displayName || 'Usuário',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            status: 'pending',
            totalPrice: totalPrice,
            createdAt: new Date().toISOString()
          });
          
          const newBookingId = docRef.id;
          setBookingId(newBookingId);

          // 2. Now create the Mercado Pago payment with the bookingId
          const response = await fetch('/api/payments/mercadopago/pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: totalPrice,
              description: `Reserva: ${selectedCourt.name} - ${selectedTime}`,
              email: auth.currentUser?.email || 'cliente@exemplo.com',
              firstName: auth.currentUser?.displayName?.split(' ')[0] || 'Cliente',
              lastName: auth.currentUser?.displayName?.split(' ')[1] || 'Crossbol',
              bookingId: newBookingId, // Pass our ID to link them
            }),
          });

          if (!response.ok) throw new Error('Falha ao criar pagamento');

          const data = await response.json();
          setPixData({
            id: data.id,
            copyPaste: data.pix_copy_paste,
            qrCodeBase64: data.pix_qr_code_base64,
          });

          // 3. Update the booking with MP details
          await updateDoc(docRef, {
            mercadopagoPaymentId: data.id,
            pixCopyPaste: data.pix_copy_paste,
            pixQrCodeBase64: data.pix_qr_code_base64,
          });

          console.log("Booking linked with MP Payment:", data.id);
        } catch (error) {
          console.error("Erro no fluxo de pagamento:", error);
        } finally {
          setLoading(false);
        }
      };
      createPayment();
    }
  }, [step, selectedCourt, selectedTime, duration, pixData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 3 && pixData?.id && paymentStatus !== 'approved') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/payments/mercadopago/${pixData.id}/status`);
          if (response.ok) {
            const data = await response.json();
            setPaymentStatus(data.status);
            if (data.status === 'approved') {
              // Auto-advance to success step
              handleBooking();
            }
          }
        } catch (error) {
          console.error("Erro ao verificar status do pagamento:", error);
        }
      }, 5000); // Poll every 5 seconds
    }
    return () => clearInterval(interval);
  }, [step, pixData, paymentStatus]);

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
    '20:00', '21:00', '22:00'
  ];

  const handleBooking = async () => {
    if (!selectedCourt || !selectedTime || !auth.currentUser) return;

    setLoading(true);
    try {
      const startTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(duration));
      if (duration % 1 !== 0) {
        endTime.setMinutes(startTime.getMinutes() + 30);
      }

      const totalPrice = Number((selectedCourt.basePrice * duration).toFixed(2));

      if (bookingId) {
        // Update existing booking
        const bookingRef = doc(db, 'tenants', 'main-ct', 'bookings', bookingId);
        await updateDoc(bookingRef, {
          status: paymentStatus === 'approved' ? 'confirmed' : 'pending',
          mercadopagoPaymentId: pixData?.id || null,
          pixCopyPaste: pixData?.copyPaste || generatePixPayload(),
          pixQrCodeBase64: pixData?.qrCodeBase64 || null,
          totalPrice: totalPrice, // Update price just in case
        });
      } else {
        // Fallback: Create new booking (should not happen in normal flow now)
        await addDoc(collection(db, 'tenants', 'main-ct', 'bookings'), {
          tenantId: 'main-ct',
          courtId: selectedCourt.id,
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Usuário',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: paymentStatus === 'approved' ? 'confirmed' : 'pending',
          totalPrice: totalPrice,
          mercadopagoPaymentId: pixData?.id || null,
          pixCopyPaste: pixData?.copyPaste || generatePixPayload(),
          pixQrCodeBase64: pixData?.qrCodeBase64 || null,
          createdAt: new Date().toISOString()
        });
      }

      setStep(4); // Success
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generatePixPayload = () => {
    const amount = (selectedCourt?.basePrice || 0) * duration;
    const amountStr = amount.toFixed(2);
    
    // PIX Payload parts
    const part1 = "000201"; // Payload Format Indicator
    const part2 = "26360014BR.GOV.BCB.PIX0114crossbolmanager"; // Merchant Account Information
    const part3 = "52040000"; // Merchant Category Code
    const part4 = "5303986"; // Transaction Currency (986 = BRL)
    const part5 = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`; // Transaction Amount
    const part6 = "5802BR"; // Country Code
    const part7 = "5913Crossbol Manager"; // Merchant Name
    const part8 = "6009SAO PAULO"; // Merchant City
    const part9 = "62070503***"; // Additional Data Field Template
    const part10 = "6304"; // CRC16 Indicator

    const fullPayloadWithoutCRC = part1 + part2 + part3 + part4 + part5 + part6 + part7 + part8 + part9 + part10;
    
    // Simple CRC16-CCITT (Initial 0xFFFF, Poly 0x1021)
    const calculateCRC16 = (data: string) => {
      let crc = 0xFFFF;
      for (let i = 0; i < data.length; i++) {
        crc ^= data.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
          if (crc & 0x8000) {
            crc = (crc << 1) ^ 0x1021;
          } else {
            crc <<= 1;
          }
        }
      }
      return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    };

    return fullPayloadWithoutCRC + calculateCRC16(fullPayloadWithoutCRC);
  };

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
    // Ensure the textarea is not visible but still part of the DOM
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

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tighter neon-text">RESERVAR QUADRA</h1>
          <p className="text-gray-400">Escolha a quadra, o horário e jogue.</p>
        </div>
        {step > 1 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} /> Voltar
          </button>
        )}
      </header>

      {/* Steps Indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold transition-all",
              step >= i ? "bg-neon text-black neon-shadow" : "bg-white/10 text-gray-500"
            )}>
              {i}
            </div>
            {i < 3 && <div className={cn("w-12 h-0.5", step > i ? "bg-neon" : "bg-white/10")} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {courts.map((court) => (
              <GlassCard 
                key={court.id} 
                className={cn(
                  "cursor-pointer border-2 transition-all",
                  selectedCourt?.id === court.id ? "border-neon bg-neon/5" : "border-transparent"
                )}
                onClick={() => {
                  setSelectedCourt(court);
                  setStep(2);
                }}
              >
                <div className="aspect-video bg-white/5 rounded-xl mb-4 flex items-center justify-center overflow-hidden">
                  <Dribbble size={48} className="text-white/10" />
                </div>
                <h3 className="text-xl font-bold mb-2">{court.name}</h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{court.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-neon font-black text-xl">{formatCurrency(court.basePrice)}/h</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCourt(court);
                      setStep(2);
                    }}
                    className="px-4 py-2 bg-white/10 rounded-lg text-sm font-bold hover:bg-neon hover:text-black transition-all"
                  >
                    Selecionar
                  </button>
                </div>
              </GlassCard>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-4">
              <button onClick={() => setStep(1)} className="p-2 glass hover:text-neon transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-2xl font-bold">Escolha o Horário</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <GlassCard className="lg:col-span-1">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold">Data</h3>
                  <div className="flex gap-2">
                    <button className="p-1 hover:text-neon"><ChevronLeft size={20} /></button>
                    <button className="p-1 hover:text-neon"><ChevronRight size={20} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-xs mb-4">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, idx) => <div key={idx} className="text-gray-500">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }).map((_, i) => {
                    const day = i + 1;
                    const isSelected = day === selectedDate.getDate();
                    return (
                      <button 
                        key={i}
                        onClick={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setDate(day);
                          setSelectedDate(newDate);
                        }}
                        className={cn(
                          "aspect-square rounded-lg flex items-center justify-center text-sm transition-all",
                          isSelected ? "bg-neon text-black font-bold neon-shadow" : "hover:bg-white/10"
                        )}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </GlassCard>

              <GlassCard className="lg:col-span-2">
                <h3 className="font-bold mb-6">Duração e Horário</h3>
                
                <div className="mb-8">
                  <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest">Duração do Jogo</p>
                  <div className="flex gap-4">
                    {[1, 1.5, 2, 3].map((h) => (
                      <button
                        key={h}
                        onClick={() => setDuration(h)}
                        className={cn(
                          "px-6 py-3 rounded-xl font-bold transition-all border",
                          duration === h ? "bg-neon text-black border-neon neon-shadow" : "glass border-white/10 hover:bg-white/5"
                        )}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-gray-400 mb-4 uppercase tracking-widest">Horários Disponíveis</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-8">
                  {timeSlots.map((time) => {
                    const isOccupied = existingBookings.some(b => {
                      const bTime = new Date(b.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      return bTime === time;
                    });

                    return (
                      <button
                        key={time}
                        disabled={isOccupied}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-4 rounded-xl border-2 font-bold transition-all relative overflow-hidden",
                          selectedTime === time 
                            ? "border-neon bg-neon text-black neon-shadow" 
                            : isOccupied
                              ? "border-red-500/20 bg-red-500/5 text-red-500/50 cursor-not-allowed"
                              : "border-white/5 bg-white/5 hover:border-neon/50"
                        )}
                      >
                        {time}
                        {isOccupied && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
                            <span className="text-[10px] uppercase font-black rotate-12">Ocupado</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-lg">
                      <Clock size={20} className="text-neon" />
                      Status da Agenda
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1 bg-neon/10 rounded-full border border-neon/20">
                      <div className="w-2 h-2 rounded-full bg-neon animate-pulse" />
                      <span className="text-[10px] font-black text-neon uppercase tracking-tighter">Ao Vivo</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {existingBookings.length === 0 ? (
                      <div className="col-span-full p-8 glass border-dashed border-white/10 rounded-2xl text-center">
                        <p className="text-sm text-gray-500 italic">Nenhuma reserva para este dia ainda. Seja o primeiro!</p>
                      </div>
                    ) : (
                      existingBookings.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((booking, idx) => (
                        <motion.div 
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                              <Dribbble size={24} className="text-neon" />
                            </div>
                            <div>
                              <div className="font-black text-lg tracking-tight">
                                {new Date(booking.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="text-xs text-gray-400 font-medium">{booking.userName}</div>
                            </div>
                          </div>
                          <div className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                            booking.status === 'confirmed' 
                              ? "bg-green-500/10 text-green-500 border-green-500/20" 
                              : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                          )}>
                            {booking.status === 'confirmed' ? 'Reservado' : 'Pendente'}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>

            <div className="flex justify-end">
              <button
                disabled={!selectedTime}
                onClick={() => setStep(3)}
                className="px-12 py-4 bg-neon text-black font-bold rounded-2xl neon-shadow disabled:opacity-50 hover:scale-105 transition-transform"
              >
                Continuar para Pagamento
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <GlassCard className="space-y-8">
              <div className="flex justify-between items-start border-b border-white/10 pb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Resumo da Reserva</h2>
                  <p className="text-gray-400">{selectedCourt?.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-neon font-black text-2xl">{formatCurrency((selectedCourt?.basePrice || 0) * duration)}</div>
                  <p className="text-xs text-gray-500">Total a pagar</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 glass border-white/10">
                  <CalendarIcon className="text-neon" size={20} />
                  <div>
                    <div className="text-sm text-gray-400">Data</div>
                    <div className="font-bold">{selectedDate.toLocaleDateString('pt-BR')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 glass border-white/10">
                  <Clock className="text-neon" size={20} />
                  <div>
                    <div className="text-sm text-gray-400">Horário</div>
                    <div className="font-bold">{selectedTime} ({duration}h)</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold">Método de Pagamento</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 glass border-neon/50 bg-neon/5 flex flex-col items-center gap-4 text-center">
                    <div className="w-48 h-48 bg-white p-2 rounded-xl flex items-center justify-center">
                      {loading && !pixData ? (
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-neon"></div>
                      ) : pixData?.qrCodeBase64 ? (
                        <img 
                          src={pixData.qrCodeBase64.startsWith('data:') ? pixData.qrCodeBase64 : `data:image/png;base64,${pixData.qrCodeBase64}`} 
                          alt="QR Code PIX"
                          className="w-full h-full"
                        />
                      ) : (
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatePixPayload())}`} 
                          alt="QR Code PIX Fallback"
                          className="w-full h-full opacity-50"
                        />
                      )}
                    </div>
                    <div className="space-y-2 w-full">
                      <p className="text-xs text-gray-400 uppercase tracking-widest">
                        {paymentStatus === 'approved' ? 'Pagamento Aprovado!' : pixData ? 'Escaneie o QR Code acima ou copie o código' : 'Gerando PIX... (Usando fallback se necessário)'}
                      </p>
                      {paymentStatus === 'approved' && (
                        <div className="flex items-center justify-center gap-2 text-green-500 font-bold">
                          <CheckCircle2 size={20} />
                          <span>Confirmado!</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input 
                          readOnly 
                          value={pixData?.copyPaste || generatePixPayload()} 
                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono outline-none"
                        />
                        <button 
                          onClick={() => copyToClipboard(pixData?.copyPaste || generatePixPayload())}
                          className={cn(
                            "px-4 py-2 rounded-lg text-xs font-bold transition-all min-w-[80px]",
                            copied ? "bg-green-500 text-white" : "bg-neon text-black"
                          )}
                        >
                          {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {statusMessage && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold text-center">
                    {statusMessage}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  if (paymentStatus === 'approved') {
                    handleBooking();
                  } else {
                    // Manual check
                    const checkStatus = async () => {
                      if (!pixData?.id) return;
                      setLoading(true);
                      try {
                        const response = await fetch(`/api/payments/mercadopago/${pixData.id}/status`);
                        const data = await response.json();
                        if (data.status === 'approved') {
                          handleBooking();
                        } else {
                          setStatusMessage('Pagamento ainda não identificado. Por favor, aguarde alguns instantes.');
                        }
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setLoading(false);
                      }
                    };
                    checkStatus();
                  }
                }}
                disabled={loading}
                className="w-full py-4 bg-neon text-black font-bold rounded-2xl neon-shadow hover:scale-[1.02] transition-transform disabled:opacity-50"
              >
                {loading ? 'Processando...' : paymentStatus === 'approved' ? 'Finalizar Reserva' : 'Já realizei o pagamento'}
              </button>
            </GlassCard>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center space-y-6 py-12"
          >
            <div className="w-24 h-24 bg-neon/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 size={64} className="text-neon" />
            </div>
            <h2 className="text-4xl font-black tracking-tighter neon-text">RESERVA REALIZADA!</h2>
            <p className="text-gray-400">Sua reserva foi confirmada com sucesso. Você receberá um lembrete no WhatsApp.</p>
            <div className="pt-8">
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedTime(null);
                }}
                className="px-8 py-4 bg-neon text-black font-bold rounded-2xl neon-shadow hover:scale-105 transition-transform"
              >
                Fazer Outra Reserva
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

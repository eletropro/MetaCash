import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Save, LogOut, Building, User as UserIcon, Phone, MapPin, FileText, CheckCircle2, Fuel, Navigation, Map as MapIcon, ArrowRight, Loader2 } from 'lucide-react';
import { calculateRoute, RouteResult, searchAddress, reverseGeocode } from '../services/routeService';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Profile({ user }: { user: User }) {
  const [profile, setProfile] = useState<UserProfile>({
    uid: user.uid,
    companyName: '',
    ownerName: '',
    email: user.email || '',
    phone: '',
    address: '',
    contractClauses: '',
    monthlyGoal: 10000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Route Calculator State
  const [destination, setDestination] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  
  // Map State
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]); // Default SP
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        // Try to geocode origin if it exists
        if (data.address) {
          searchAddress(data.address).then(res => {
            if (res.coords) {
              setOriginCoords(res.coords);
              setMapCenter(res.coords);
            }
          });
        }
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

  const handleSearchOrigin = async () => {
    if (!profile.address) return;
    setSearchingOrigin(true);
    setCalcError(null);
    try {
      const res = await searchAddress(profile.address);
      if (res.address === profile.address && !res.coords) {
        setCalcError("Não foi possível validar este endereço. Tente ser mais específico (ex: incluir cidade e estado).");
      } else {
        setProfile(prev => ({ ...prev, address: res.address }));
        if (res.coords) {
          setOriginCoords(res.coords);
          setMapCenter(res.coords);
        }
      }
    } catch (e) {
      setCalcError("Erro ao conectar com o serviço de busca.");
    } finally {
      setSearchingOrigin(false);
    }
  };

  const handleSearchDest = async () => {
    if (!destination) return;
    setSearchingDest(true);
    setCalcError(null);
    try {
      const res = await searchAddress(destination);
      if (res.address === destination && !res.coords) {
        setCalcError("Endereço de destino não reconhecido. Tente digitar o nome da rua e cidade.");
      } else {
        setDestination(res.address);
        if (res.coords) {
          setDestCoords(res.coords);
          setMapCenter(res.coords);
        }
      }
    } catch (e) {
      setCalcError("Erro ao buscar endereço de destino.");
    } finally {
      setSearchingDest(false);
    }
  };

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setSearchingDest(true);
    setDestCoords([lat, lng]); // Set coords immediately for visual feedback
    setMapCenter([lat, lng]);
    try {
      const addr = await reverseGeocode(lat, lng);
      if (addr && addr !== `${lat}, ${lng}`) {
        setDestination(addr);
      } else {
        setDestination(`Localização selecionada (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch (e) {
      console.error("Erro no clique do mapa:", e);
      setDestination(`Localização: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      setSearchingDest(false);
    }
  };

  const handleCalculate = async () => {
    if (!profile.address) {
      setCalcError("Por favor, salve o endereço da sua empresa primeiro.");
      return;
    }
    if (!destination) {
      setCalcError("Por favor, insira o endereço do cliente.");
      return;
    }

    setCalcError(null);
    setCalculating(true);
    try {
      let currentOriginCoords = originCoords;
      if (!currentOriginCoords && profile.address) {
        const res = await searchAddress(profile.address);
        if (res.coords) {
          currentOriginCoords = res.coords;
          setOriginCoords(res.coords);
        }
      }

      let currentDestCoords = destCoords;
      if (!currentDestCoords && destination) {
        const res = await searchAddress(destination);
        if (res.coords) {
          currentDestCoords = res.coords;
          setDestCoords(res.coords);
        }
      }

      if (!profile.address || !destination) {
        setCalcError("Certifique-se de que ambos os endereços estão preenchidos.");
        setCalculating(false);
        return;
      }

      const res = await calculateRoute(
        profile.address,
        destination,
        profile.fuelPrice || 0,
        profile.fuelConsumption || 1,
        currentOriginCoords || undefined,
        currentDestCoords || undefined
      );
      
      if (res.distanceKm === 0) {
        setCalcError("Não foi possível calcular a distância. Tente ser mais específico no endereço ou clique diretamente no mapa para marcar os pontos.");
      } else {
        setRouteResult(res);
        if (res.originCoords) setOriginCoords(res.originCoords);
        if (res.destCoords) {
          setDestCoords(res.destCoords);
          setMapCenter(res.destCoords);
        }
      }
    } catch (error) {
      console.error("Erro no cálculo:", error);
      setCalcError("Ocorreu um erro ao tentar calcular a rota. Verifique sua conexão.");
    } finally {
      setCalculating(false);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 sm:pb-0">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Configurações</h2>
          <p className="text-zinc-400 text-xs sm:text-sm">Personalize sua empresa e documentos.</p>
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
            <div className="flex items-center gap-3 text-emerald-500 font-bold text-sm mb-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Building size={20} />
              </div>
              Dados da Empresa
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nome da Empresa</label>
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
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nome do Responsável</label>
                <input
                  type="text"
                  value={profile.ownerName}
                  onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                  className="input-saas"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Meta de Faturamento Mensal (R$)</label>
                <input
                  type="number"
                  value={profile.monthlyGoal || ''}
                  onChange={(e) => setProfile({ ...profile, monthlyGoal: parseFloat(e.target.value) })}
                  className="input-saas"
                  placeholder="Ex: 10000"
                />
              </div>
            </div>
          </div>

          <div className="card-saas p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 text-emerald-500 font-bold text-sm mb-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Phone size={20} />
              </div>
              Contato e Localização
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">WhatsApp Business</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="input-saas py-3"
                  placeholder="5511999999999"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Endereço Fiscal (Origem)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="input-saas py-3"
                    placeholder="Rua, Número, Bairro, Cidade"
                  />
                  <button
                    type="button"
                    onClick={handleSearchOrigin}
                    disabled={searchingOrigin || !profile.address}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"
                    title="Buscar endereço oficial"
                  >
                    {searchingOrigin ? <Loader2 className="animate-spin" size={18} /> : <MapIcon size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card-saas p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 text-emerald-500 font-bold text-sm mb-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Fuel size={20} />
              </div>
              Configuração de Combustível
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Preço Litro (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={profile.fuelPrice || ''}
                  onChange={(e) => setProfile({ ...profile, fuelPrice: parseFloat(e.target.value) })}
                  className="input-saas py-3"
                  placeholder="5.89"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Consumo (KM/L)</label>
                <input
                  type="number"
                  step="0.1"
                  value={profile.fuelConsumption || ''}
                  onChange={(e) => setProfile({ ...profile, fuelConsumption: parseFloat(e.target.value) })}
                  className="input-saas py-3"
                  placeholder="12.5"
                />
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 italic">Estes valores são usados para calcular o custo de deslocamento.</p>
          </div>

          <div className="card-saas p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 text-emerald-500 font-bold text-sm mb-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <FileText size={20} />
              </div>
              Termos do Contrato
            </div>
            <textarea
              value={profile.contractClauses}
              onChange={(e) => setProfile({ ...profile, contractClauses: e.target.value })}
              className="input-saas min-h-[100px] py-3 text-xs"
              placeholder="Cláusulas padrão para seus PDFs..."
            />
          </div>
        </div>

        {/* Route Calculator Section with Map */}
        <div className="card-saas p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-500 font-bold text-sm mb-2">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Navigation size={20} />
            </div>
            Calculadora de Deslocamento Visual
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <p className="text-xs text-zinc-400">Clique no mapa para definir o destino ou digite o endereço abaixo.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Endereço do Cliente</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="input-saas pr-12"
                        placeholder="Digite o endereço do cliente..."
                      />
                      <button
                        type="button"
                        onClick={handleSearchDest}
                        disabled={searchingDest || !destination}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-zinc-300 transition-all"
                      >
                        {searchingDest ? <Loader2 className="animate-spin" size={16} /> : <MapIcon size={16} />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleCalculate}
                      disabled={calculating || !profile.address || !destination}
                      className="btn-primary px-6"
                    >
                      {calculating ? <Loader2 className="animate-spin" size={20} /> : 'Calcular'}
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-500 italic">Lembre-se de salvar suas configurações de combustível acima para um cálculo preciso.</p>
                  {calcError && <p className="text-[10px] text-rose-500 mt-2 font-bold">{calcError}</p>}
                </div>

                {routeResult && (
                  <div className="bg-zinc-800/50 rounded-3xl p-6 border border-zinc-800 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Distância</p>
                        <p className="text-xl font-bold text-white">{routeResult.distanceKm} km</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Tempo Est.</p>
                        <p className="text-xl font-bold text-white">{routeResult.durationText}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-700">
                      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mb-1">Custo de Combustível</p>
                      <p className="text-2xl font-bold text-emerald-500">R$ {routeResult.fuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <a
                      href={routeResult.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-xs font-bold transition-all mt-2"
                    >
                      <MapIcon size={16} /> Ver no Google Maps <ArrowRight size={14} />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="h-[400px] rounded-3xl overflow-hidden border border-white/5 shadow-2xl z-0">
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapUpdater center={mapCenter} />
                <MapEvents onLocationSelect={handleMapLocationSelect} />
                {originCoords && (
                  <Marker position={originCoords}>
                    <Popup>Sua Empresa</Popup>
                  </Marker>
                )}
                {destCoords && (
                  <Marker position={destCoords}>
                    <Popup>Cliente</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
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
            className="w-full sm:w-48 bg-rose-500/10 text-rose-500 font-bold py-4 sm:py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-500/20 active:scale-95 transition-all border border-rose-500/20"
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      </form>
    </div>
  );
}

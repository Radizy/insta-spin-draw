import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Entregador } from '@/lib/api';

// Ícone customizado baseado no status do motoboy
const createCustomIcon = (status: string) => {
    const color = status === 'entregando' ? '#22c55e' : (status === 'chamado' ? '#eab308' : '#3b82f6');
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });
};

const createStoreIcon = () => {
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 8px; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">🏠</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

const createFilaIcon = () => {
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: #f97316; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px; color: white;">📦</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
    });
};

const createCozinhaIcon = () => {
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: #0ea5e9; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px; color: white;">🍳</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
    });
};

interface MotoboyMapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entregadores: Entregador[];
    storeLat?: number | null;
    storeLng?: number | null;
    storeCity?: string;
    storeState?: string;
    pedidosFila?: any[];
    pedidosMapa?: any[];
}

export function MotoboyMapModal({ open, onOpenChange, entregadores, storeLat, storeLng, storeCity, storeState, pedidosFila, pedidosMapa }: MotoboyMapModalProps) {
    const [activeMotoboys, setActiveMotoboys] = useState<Entregador[]>([]);
    const [geocodedFila, setGeocodedFila] = useState<any[]>([]);
    const [center, setCenter] = useState<[number, number]>([-23.55052, -46.633308]);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

    useEffect(() => {
        const today = new Date().toDateString();
        const lastCleared = localStorage.getItem('FilaLab_Geocode_LastCleared');
        if (lastCleared !== today) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('FilaLab_Geocode_')) localStorage.removeItem(key);
            });
            localStorage.setItem('FilaLab_Geocode_LastCleared', today);
        }
    }, []);

    useEffect(() => {
        if (open) {
            const active = entregadores.filter(e => {
                if (!e.lat || !e.lng || !e.last_location_time) return false;
                const diffMinutes = (new Date().getTime() - new Date(e.last_location_time).getTime()) / 60000;
                return diffMinutes <= 60;
            });
            setActiveMotoboys(active);

            if (storeLat != null && storeLng != null && !isNaN(storeLat) && !isNaN(storeLng)) {
                setCenter([storeLat, storeLng]);
            } else if (active.length > 0) {
                let validLats = 0; let validLngs = 0; let validCount = 0;
                active.forEach(e => {
                    const lat = parseFloat(String(e.lat).replace(',', '.'));
                    const lng = parseFloat(String(e.lng).replace(',', '.'));
                    if (!isNaN(lat) && !isNaN(lng)) { validLats += lat; validLngs += lng; validCount++; }
                });
                if (validCount > 0) setCenter([validLats / validCount, validLngs / validCount]);
            }
        }
    }, [open, entregadores, storeLat, storeLng]);

    useEffect(() => {
        if (!open || !pedidosFila || pedidosFila.length === 0) {
            setGeocodedFila([]);
            return;
        }
        const processAddress = async () => {
            const validPedidos = pedidosFila.filter(p => typeof p.endereco === 'string' && p.endereco.trim().length > 5 && !p.endereco.toLowerCase().includes('retirada') && !p.endereco.toLowerCase().includes('balcão'));
            const resolved = [];
            for (const pedido of validPedidos) {
                let rawAddress = pedido.endereco.split('-')[0].trim();
                const cached = localStorage.getItem(`FilaLab_Geocode_${rawAddress}`);
                if (cached) {
                    resolved.push({ ...pedido, coords: JSON.parse(cached) });
                } else {
                    try {
                        const q = encodeURIComponent(`${rawAddress}, ${storeCity || ''}, ${storeState || ''}, Brasil`);
                        let u = `https://nominatim.openstreetmap.org/search?format=json&q=${q}`;
                        const res = await fetch(u);
                        const data = await res.json();
                        if (data && data.length > 0) {
                            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                            localStorage.setItem(`FilaLab_Geocode_${rawAddress}`, JSON.stringify(coords));
                            resolved.push({ ...pedido, coords });
                        }
                        await new Promise(r => setTimeout(r, 1100));
                    } catch (e) { }
                }
            }
            setGeocodedFila(resolved);
        };
        processAddress();
    }, [pedidosFila, open, storeCity, storeState]);

    useEffect(() => {
        if (!open || !mapRef.current) return;

        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView(center, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstance.current);

            // A arma nuclear contra o bug do React Modal
            let count = 0;
            const fixInterval = setInterval(() => {
                if (mapInstance.current) mapInstance.current.invalidateSize(true);
                if (++count > 20) clearInterval(fixInterval);
            }, 50);
        }

        if (mapInstance.current) {
            mapInstance.current.setView(center, mapInstance.current.getZoom() || 13);
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            if (storeLat && storeLng && !isNaN(storeLat) && !isNaN(storeLng)) {
                const sm = L.marker([storeLat, storeLng], { icon: createStoreIcon(), zIndexOffset: 1000 }).bindPopup('<b>Sua Loja</b>').addTo(mapInstance.current);
                markersRef.current.push(sm);
            }

            activeMotoboys.forEach(e => {
                const lat = parseFloat(String(e.lat).replace(',', '.'));
                const lng = parseFloat(String(e.lng).replace(',', '.'));
                if (!isNaN(lat) && !isNaN(lng)) {
                    const m = L.marker([lat, lng], { icon: createCustomIcon(e.status) })
                        .bindPopup(`<b>${e.nome}</b><br/>Status: ${e.status}`).addTo(mapInstance.current!);
                    markersRef.current.push(m);
                }
            });

            geocodedFila.forEach(p => {
                if (p.coords && !isNaN(p.coords.lat)) {
                    const isCozinha = p.status === 'Cozinha';
                    const m = L.marker([p.coords.lat, p.coords.lng], { 
                        icon: isCozinha ? createCozinhaIcon() : createFilaIcon(), 
                        zIndexOffset: 500 
                    })
                    .bindPopup(`<b>${p.cliente}</b><br/>Status: ${p.status || 'Na Fila'}`).addTo(mapInstance.current!);
                    markersRef.current.push(m);
                }
            });

            if (pedidosMapa) {
                pedidosMapa.forEach(p => {
                    const lat = parseFloat(p.lat);
                    const lng = parseFloat(p.lng);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        const m = L.marker([lat, lng], { icon: createFilaIcon(), zIndexOffset: 600 })
                            .bindPopup(`<b>${p.cliente || 'Mapa'}</b><br/>Rota Saipos`).addTo(mapInstance.current!);
                        markersRef.current.push(m);
                    }
                });
            }
        }
    }, [open, center, activeMotoboys, geocodedFila, storeLat, storeLng, pedidosMapa]);

    // Limpeza rigorosa no Unmount / Close
    useEffect(() => {
        if (!open && mapInstance.current) {
            mapInstance.current.remove();
            mapInstance.current = null;
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl p-4 gap-2 flex flex-col bg-background" style={{ minHeight: '600px' }}>
                <DialogHeader>
                    <DialogTitle className="font-mono text-xl">Mapa de Entregadores em Tempo Real</DialogTitle>
                </DialogHeader>

                {/* Div do Container principal flex */}
                <div className="w-full flex-1 rounded-md overflow-hidden relative border bg-secondary/10" style={{ minHeight: '400px' }}>
                    {/* A âncora absoluta que o Leaflet adora */}
                    {open && <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }} />}
                </div>

                <div className="flex gap-4 justify-center items-center font-mono text-xs opacity-80 mt-2">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Disponível</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Chamado</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Entregando</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center text-[8px] text-white">📦</div> Aguardando</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-sky-500 flex items-center justify-center text-[8px] text-white">🍳</div> Na Cozinha</div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

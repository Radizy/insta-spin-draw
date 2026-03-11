import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Entregador } from '@/lib/api';
import { Home } from 'lucide-react';

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

interface MotoboyMapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entregadores: Entregador[];
    storeLat?: number | null;
    storeLng?: number | null;
    storeCity?: string;
    storeState?: string;
    pedidosFila?: any[];
}

export function MotoboyMapModal({ open, onOpenChange, entregadores, storeLat, storeLng, storeCity, storeState, pedidosFila }: MotoboyMapModalProps) {
    const [activeMotoboys, setActiveMotoboys] = useState<Entregador[]>([]);
    const [geocodedFila, setGeocodedFila] = useState<any[]>([]);
    const [center, setCenter] = useState<[number, number]>([-23.55052, -46.633308]);
    const [renderMap, setRenderMap] = useState(false);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

    // Limpeza de Cache de Geocodificação Diária
    useEffect(() => {
        const today = new Date().toDateString();
        const lastCleared = localStorage.getItem('FilaLab_Geocode_LastCleared');
        
        if (lastCleared !== today) {
            console.log("[FILALAB] Iniciando nova diária. Limpando cache local de geodiodificaçã de rotas...");
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('FilaLab_Geocode_')) {
                    localStorage.removeItem(key);
                }
            });
            localStorage.setItem('FilaLab_Geocode_LastCleared', today);
        }
    }, []);

    // Processamento dos motoboys ativos e cálculo do centro
    useEffect(() => {
        if (open) {
            const active = entregadores.filter(e => {
                if (!e.lat || !e.lng || !e.last_location_time) return false;
                const lastTime = new Date(e.last_location_time).getTime();
                const now = new Date().getTime();
                const diffMinutes = (now - lastTime) / (1000 * 60);
                return diffMinutes <= 60;
            });
            setActiveMotoboys(active);

            // Se tem a coordenada da loja, sempre centraliza nela
            if (storeLat != null && storeLng != null && !isNaN(storeLat) && !isNaN(storeLng)) {
                setCenter([storeLat, storeLng]);
            } else if (active.length > 0) {
                let validLats = 0;
                let validLngs = 0;
                let validCount = 0;

                active.forEach(e => {
                    const lat = parseFloat(String(e.lat).replace(',', '.'));
                    const lng = parseFloat(String(e.lng).replace(',', '.'));
                    if (!isNaN(lat) && !isNaN(lng)) {
                        validLats += lat;
                        validLngs += lng;
                        validCount++;
                    }
                });

                if (validCount > 0) {
                    setCenter([validLats / validCount, validLngs / validCount]);
                }
            }
        }
    }, [open, entregadores, storeLat, storeLng]);

    // Geocodificação dos pedidos em fila
    useEffect(() => {
        if (!open || !pedidosFila || pedidosFila.length === 0) {
            setGeocodedFila([]);
            return;
        }
        
        // Filtramos pra garantir que seja um endereço razoavelmente válido ("Retirada", "Balcão" não vão pro mapa)
        const validPedidos = pedidosFila.filter(p => typeof p.endereco === 'string' && p.endereco.trim().length > 5 && !p.endereco.toLowerCase().includes('retirada') && !p.endereco.toLowerCase().includes('balcão'));

        const processAddress = async () => {
            const resolved = [];
            
            for (const pedido of validPedidos) {
                // Remove traços/bairros mal formatados para melhorar hit-rate no Nominatim
                let rawAddress = pedido.endereco.split('-')[0].trim();
                const cacheKey = `FilaLab_Geocode_${rawAddress}`;
                const cached = localStorage.getItem(cacheKey);
                
                if (cached) {
                    resolved.push({ ...pedido, coords: JSON.parse(cached) });
                } else {
                    try {
                        let locationContext = 'Brasil';
                        if (storeCity && storeState) {
                            locationContext = `${storeCity}, ${storeState}, Brasil`;
                        } else if (storeCity) {
                            locationContext = `${storeCity}, Brasil`;
                        }

                        const query = encodeURIComponent(`${rawAddress}, ${locationContext}`);
                        let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
                        
                        // Otimização de proximidade: se a loja tem coordenada, diz pra API priorizar resultados num raio de ~15km ao redor
                        if (storeLat && storeLng && !isNaN(storeLat) && !isNaN(storeLng)) {
                            // 1 grau latitude/longitude é ~111km. 0.15 é aprox 16km
                            const left = storeLng - 0.15;
                            const bottom = storeLat - 0.15;
                            const right = storeLng + 0.15;
                            const top = storeLat + 0.15;
                            // formato do viewbox no nominatim: x1,y1,x2,y2 (left,top,right,bottom)
                            const viewbox = `${left},${top},${right},${bottom}`;
                            apiUrl += `&viewbox=${viewbox}&bounded=1`;
                        }

                        const res = await fetch(apiUrl);
                        const data = await res.json();
                        
                        if (data && data.length > 0) {
                            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                            localStorage.setItem(cacheKey, JSON.stringify(coords));
                            resolved.push({ ...pedido, coords });
                        }
                        
                        // Previdente do Rate Limit do Nominatim OS (1 chamada por segundo recomendedo)
                        await new Promise(r => setTimeout(r, 1100));
                    } catch (e) {
                        console.error("Erro ao geocodificar pedido da fila", pedido.endereco, e);
                    }
                }
            }
            
            setGeocodedFila(resolved);
        };
        
        processAddress();
    }, [pedidosFila, open]);

    // Delay de montagem para não brigar com animação do Radix Modal
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setRenderMap(true), 300);
            return () => clearTimeout(timer);
        } else {
            setRenderMap(false);
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        }
    }, [open]);

    // Lógica principal do Leaflet Puro (Vanilla)
    useEffect(() => {
        if (renderMap && mapRef.current && !mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView(center, 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(mapInstance.current);
        }

        if (mapInstance.current) {
            // Atualiza centro se mudar
            mapInstance.current.setView(center, mapInstance.current.getZoom() || 13);

            // Limpa marcadores antigos
            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

            // Adiciona marcador da loja
            if (storeLat != null && storeLng != null && !isNaN(storeLat) && !isNaN(storeLng)) {
                const storeMarker = L.marker([storeLat, storeLng], {
                    icon: createStoreIcon(),
                    zIndexOffset: 1000 // A loja sempre fica por cima
                })
                .bindPopup('<div class="font-bold">Sua Loja</div>')
                .addTo(mapInstance.current);
                
                markersRef.current.push(storeMarker);
            }

            // Adiciona novos marcadores
            activeMotoboys.forEach(e => {
                const latNum = parseFloat(String(e.lat).replace(',', '.'));
                const lngNum = parseFloat(String(e.lng).replace(',', '.'));
                if (!isNaN(latNum) && !isNaN(lngNum)) {
                    const marker = L.marker([latNum, lngNum], {
                        icon: createCustomIcon(e.status)
                    });
                    
                    const filaText = e.status === 'disponivel' && e.fila_posicao ? `<br />Fila: #${e.fila_posicao}` : '';
                    marker.bindPopup(`<div class="font-mono text-sm"><strong>${e.nome}</strong><br />Status: ${e.status}${filaText}</div>`);
                    
                    marker.addTo(mapInstance.current!);
                    markersRef.current.push(marker);
                }
            });

            // Adiciona marcadores de Fila
            geocodedFila.forEach(pedido => {
                if (pedido.coords && !isNaN(pedido.coords.lat) && !isNaN(pedido.coords.lng)) {
                    const marker = L.marker([pedido.coords.lat, pedido.coords.lng], {
                        icon: createFilaIcon(),
                        zIndexOffset: 500
                    });
                    
                    marker.bindPopup(`<div class="font-mono text-sm leading-tight text-center"><strong>Pedido #${pedido.id}</strong><br />Cliente: ${pedido.cliente}<br />📦 Na Fila (Produção)</div>`);
                    marker.addTo(mapInstance.current!);
                    markersRef.current.push(marker);
                }
            });
        }
    }, [renderMap, center, activeMotoboys, geocodedFila, storeLat, storeLng]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl h-[80vh] flex flex-col p-4">
                <DialogHeader>
                    <DialogTitle className="font-mono text-xl">Mapa de Entregadores em Tempo Real</DialogTitle>
                </DialogHeader>

                <div className="flex-1 w-full rounded-md overflow-hidden border border-border mt-2 bg-secondary/20 relative">
                    {renderMap ? (
                        <div ref={mapRef} style={{ height: '100%', width: '100%', zIndex: 0 }} />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground animate-pulse font-mono">
                            Inicializando terreno...
                        </div>
                    )}
                </div>

                <div className="flex gap-4 items-center justify-center pt-2 text-xs font-mono text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Disponível</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Chamado</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Entregando</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center text-[8px] text-white">📦</div> Pedido na Fila</div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

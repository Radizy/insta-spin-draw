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

interface MotoboyMapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entregadores: Entregador[];
    storeLat?: number | null;
    storeLng?: number | null;
}

export function MotoboyMapModal({ open, onOpenChange, entregadores, storeLat, storeLng }: MotoboyMapModalProps) {
    const [activeMotoboys, setActiveMotoboys] = useState<Entregador[]>([]);
    const [center, setCenter] = useState<[number, number]>([-23.55052, -46.633308]);
    const [renderMap, setRenderMap] = useState(false);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

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
        }
    }, [renderMap, center, activeMotoboys, storeLat, storeLng]);

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

                <div className="flex gap-4 items-center justify-center pt-2 text-xs font-mono text-muted-foreground">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Disponível</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Chamado</div>
                    <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Entregando</div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

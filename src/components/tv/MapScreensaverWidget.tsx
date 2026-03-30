import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Entregador } from '@/lib/api';

// Ícone customizado baseado no status do motoboy
const createCustomIcon = (status: string) => {
    const color = status === 'entregando' ? '#22c55e' : (status === 'chamado' ? '#eab308' : '#3b82f6');
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;"></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16],
    });
};

const createStoreIcon = () => {
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: #ef4444; width: 40px; height: 40px; border-radius: 8px; border: 3px solid white; box-shadow: 0 8px 12px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">🏠</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    });
};

const createFilaIcon = () => {
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: #f97316; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 18px; color: white;">📦</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
    });
};

interface MapScreensaverWidgetProps {
    entregadores: Entregador[];
    pedidosFila: any[];
    storeLat?: number | null;
    storeLng?: number | null;
    storeCity?: string;
    storeState?: string;
}

export function MapScreensaverWidget({ entregadores, pedidosFila, storeLat, storeLng, storeCity, storeState }: MapScreensaverWidgetProps) {
    const [activeMotoboys, setActiveMotoboys] = useState<Entregador[]>([]);
    const [geocodedFila, setGeocodedFila] = useState<any[]>([]);
    const [center, setCenter] = useState<[number, number]>([-23.55052, -46.633308]);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);

    useEffect(() => {
        const active = entregadores.filter(e => {
            if (!e.lat || !e.lng || !e.last_location_time) return false;
            const lastTime = new Date(e.last_location_time).getTime();
            const now = new Date().getTime();
            const diffMinutes = (now - lastTime) / (1000 * 60);
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
                if (!isNaN(lat) && !isNaN(lng)) {
                    validLats += lat; validLngs += lng; validCount++;
                }
            });
            if (validCount > 0) setCenter([validLats / validCount, validLngs / validCount]);
        }
    }, [entregadores, storeLat, storeLng]);

    useEffect(() => {
        if (!pedidosFila || pedidosFila.length === 0) {
            setGeocodedFila([]);
            return;
        }
        
        const validPedidos = pedidosFila.filter(p => typeof p.endereco === 'string' && p.endereco.trim().length > 5 && !p.endereco.toLowerCase().includes('retirada') && !p.endereco.toLowerCase().includes('balcão'));

        const processAddress = async () => {
            const resolved = [];
            for (const pedido of validPedidos) {
                let rawAddress = pedido.endereco.split('-')[0].trim();
                const cacheKey = `FilaLab_Geocode_${rawAddress}`;
                const cached = localStorage.getItem(cacheKey);
                
                if (cached) {
                    resolved.push({ ...pedido, coords: JSON.parse(cached) });
                } else {
                    try {
                        let locationContext = 'Brasil';
                        if (storeCity && storeState) locationContext = `${storeCity}, ${storeState}, Brasil`;
                        else if (storeCity) locationContext = `${storeCity}, Brasil`;

                        const query = encodeURIComponent(`${rawAddress}, ${locationContext}`);
                        let apiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
                        
                        if (storeLat && storeLng && !isNaN(storeLat) && !isNaN(storeLng)) {
                            const left = storeLng - 0.15; const bottom = storeLat - 0.15;
                            const right = storeLng + 0.15; const top = storeLat + 0.15;
                            apiUrl += `&viewbox=${left},${top},${right},${bottom}&bounded=1`;
                        }

                        const res = await fetch(apiUrl);
                        const data = await res.json();
                        
                        if (data && data.length > 0) {
                            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                            localStorage.setItem(cacheKey, JSON.stringify(coords));
                            resolved.push({ ...pedido, coords });
                        }
                        await new Promise(r => setTimeout(r, 1100));
                    } catch (e) { }
                }
            }
            setGeocodedFila(resolved);
        };
        processAddress();
    }, [pedidosFila]);

    useEffect(() => {
        if (!mapInstance.current && mapRef.current) {
            mapInstance.current = L.map(mapRef.current, { zoomControl: false }).setView(center, 14);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstance.current);
        }

        if (mapInstance.current) {
            mapInstance.current.setView(center, mapInstance.current.getZoom());

            markersRef.current.forEach(marker => marker.remove());
            markersRef.current = [];

            if (storeLat != null && storeLng != null && !isNaN(storeLat) && !isNaN(storeLng)) {
                const storeMarker = L.marker([storeLat, storeLng], { icon: createStoreIcon(), zIndexOffset: 1000 }).addTo(mapInstance.current);
                markersRef.current.push(storeMarker);
            }

            activeMotoboys.forEach(e => {
                const latNum = parseFloat(String(e.lat).replace(',', '.'));
                const lngNum = parseFloat(String(e.lng).replace(',', '.'));
                if (!isNaN(latNum) && !isNaN(lngNum)) {
                    const marker = L.marker([latNum, lngNum], { icon: createCustomIcon(e.status) });
                    
                    const tooltipHtml = `<span style="font-size: 14px; font-weight: bold;">${e.nome}</span>`;
                    marker.bindTooltip(tooltipHtml, { permanent: true, direction: 'right', offset: [15, 0], className: 'custom-map-tooltip' });
                    
                    marker.addTo(mapInstance.current!);
                    markersRef.current.push(marker);
                }
            });

            geocodedFila.forEach(pedido => {
                if (pedido.coords && !isNaN(pedido.coords.lat) && !isNaN(pedido.coords.lng)) {
                    const marker = L.marker([pedido.coords.lat, pedido.coords.lng], { icon: createFilaIcon(), zIndexOffset: 500 });
                    marker.addTo(mapInstance.current!);
                    markersRef.current.push(marker);
                }
            });
        }
    }, [center, activeMotoboys, geocodedFila, storeLat, storeLng]);

    // Limpeza na desmontagem
    useEffect(() => {
        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    return (
        <div className="w-full h-full relative bg-[#1e1e1e]">
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-map-tooltip {
                    background: rgba(0, 0, 0, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    color: white;
                    padding: 4px 8px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(4px);
                }
                .leaflet-tooltip-left.custom-map-tooltip::before { border-left-color: rgba(0,0,0,0.7); }
                .leaflet-tooltip-right.custom-map-tooltip::before { border-right-color: rgba(0,0,0,0.7); }
            `}} />
            <div ref={mapRef} className="absolute inset-0" style={{ zIndex: 1 }} />
            
            {/* Overlay Gradient for readability of TV widgets on top */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none z-10" />
            
            <div className="absolute bottom-8 left-8 z-20 bg-slate-950/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl flex flex-col gap-3">
                <h3 className="text-white/90 font-bold uppercase tracking-widest text-sm border-b border-white/10 pb-2 mb-1">Mapa Tático de Entregas</h3>
                <div className="flex gap-4 items-center text-sm font-mono text-white/80 flex-wrap">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md"></div> Disponível</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-md"></div> Chamado</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-md"></div> Na Rua</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-[8px] text-white border-2 border-white shadow-md">📦</div> Pendente</div>
                </div>
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Entregador } from '@/lib/api';

// Ícone customizado baseado no status do motoboy
const createCustomIcon = (status: string) => {
    // Entregando: Verde | Chamado: Amarelo | Disponível na Fila: Azul
    const color = status === 'entregando' ? '#22c55e' : (status === 'chamado' ? '#eab308' : '#3b82f6');
    return L.divIcon({
        className: 'bg-transparent border-none',
        html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
    });
};

interface MotoboyMapModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entregadores: Entregador[];
}

export function MotoboyMapModal({ open, onOpenChange, entregadores }: MotoboyMapModalProps) {
    const [activeMotoboys, setActiveMotoboys] = useState<Entregador[]>([]);
    const [center, setCenter] = useState<[number, number]>([-23.55052, -46.633308]); // Padrão: SP Capital

    useEffect(() => {
        if (open) {
            // Filtrar apenas motoboys que têm lat/lng e cuja localização foi atualizada a menos de 30 minutos
            const active = entregadores.filter(e => {
                if (!e.lat || !e.lng || !e.last_location_time) return false;

                const lastTime = new Date(e.last_location_time).getTime();
                const now = new Date().getTime();
                const diffMinutes = (now - lastTime) / (1000 * 60);

                // Exibir até 60 minutos de atraso (podem estar off-line/background freeze)
                return diffMinutes <= 60;
            });

            setActiveMotoboys(active);

            if (active.length > 0) {
                // Calcular o centro geográfico a partir da média dos pontos ativos para câmera inicial
                // Supabase retorna NUMERIC como string, então precisamos de Number()
                const avgLat = active.reduce((sum, e) => sum + (Number(e.lat) || 0), 0) / active.length;
                const avgLng = active.reduce((sum, e) => sum + (Number(e.lng) || 0), 0) / active.length;

                if (!isNaN(avgLat) && !isNaN(avgLng)) {
                    setCenter([avgLat, avgLng]);
                }
            }
        }
    }, [open, entregadores]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl h-[80vh] flex flex-col p-4">
                <DialogHeader>
                    <DialogTitle className="font-mono text-xl">Mapa de Entregadores em Tempo Real</DialogTitle>
                </DialogHeader>

                <div className="flex-1 w-full rounded-md overflow-hidden border border-border mt-2">
                    {open && (
                        <MapContainer
                            center={center}
                            zoom={13}
                            style={{ height: '100%', width: '100%', zIndex: 0 }}
                            key={center.join(',')} // Força o MapContainer a re-renderizar caso o centro mude
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            {activeMotoboys.map((e) => {
                                const latNum = Number(e.lat);
                                const lngNum = Number(e.lng);
                                if (isNaN(latNum) || isNaN(lngNum)) return null;

                                return (
                                    <Marker
                                        key={e.id}
                                        position={[latNum, lngNum]}
                                        icon={createCustomIcon(e.status)}
                                    >
                                        <Popup className="font-mono text-sm">
                                            <strong>{e.nome}</strong><br />
                                            Status: {e.status}<br />
                                            {e.status === 'disponivel' && e.fila_posicao ? `Fila: #${e.fila_posicao}` : ''}
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>
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

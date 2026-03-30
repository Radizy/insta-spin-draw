import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Store, MapPin, Navigation } from 'lucide-react';
import { FranquiaBagsSection } from './FranquiaBagsSection';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Corrigir ícone padrão do Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export function DadosDaLoja() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [formData, setFormData] = useState({
    nome_loja: '',
    cep: '',
    endereco: '',
    rua: '',
    bairro: '',
    cidade: '',
    estado: '',
    numero: '',
    latitude: '',
    longitude: '',
  });

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSearchingCoords, setIsSearchingCoords] = useState(false);

  // Resolve o ID real da unidade selecionada a partir de availableUnits ou diretamente de user.unidadeId
  const resolvedUnitId = user?.availableUnits?.find(
    (u) => u.unidade_nome === selectedUnit || u.nome_loja === selectedUnit
  )?.id ?? user?.unidadeId ?? null;

  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config', resolvedUnitId],
    queryFn: async () => {
      if (!resolvedUnitId) return null;

      // Busca pela unidade_id (UUID real), que é único e inequívoco
      let { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('unidade_id', resolvedUnitId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!resolvedUnitId,
  });

  useEffect(() => {
    if (config) {
      const lat = config.latitude ? String(config.latitude) : '';
      const lng = config.longitude ? String(config.longitude) : '';
      
      setFormData({
        nome_loja: config.nome_loja || '',
        cep: config.cep || '',
        endereco: config.endereco || '',
        rua: config.rua || '',
        bairro: config.bairro || '',
        cidade: config.cidade || '',
        estado: config.estado || '',
        numero: config.numero || '',
        latitude: lat,
        longitude: lng,
      });

      if (mapInstance.current && markerRef.current && lat && lng) {
          const newPos = L.latLng(parseFloat(lat), parseFloat(lng));
          markerRef.current.setLatLng(newPos);
          mapInstance.current.setView(newPos, 16);
      }
    }
  }, [config]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initialLat = formData.latitude ? parseFloat(formData.latitude) : -23.5505;
    const initialLng = formData.longitude ? parseFloat(formData.longitude) : -46.6333;

    mapInstance.current = L.map(mapRef.current).setView([initialLat, initialLng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

    markerRef.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance.current);

    markerRef.current.on('dragend', (event) => {
      const position = event.target.getLatLng();
      setFormData(prev => ({
        ...prev,
        latitude: position.lat.toFixed(6),
        longitude: position.lng.toFixed(6)
      }));
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const searchCep = async () => {
    const limpo = formData.cep.replace(/\D/g, '');
    if (limpo.length !== 8) {
      toast.error('CEP inválido');
      return;
    }
    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error('CEP não encontrado');
      } else {
        setFormData(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
          endereco: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`,
        }));
        toast.success('Endereço localizado!');
      }
    } catch (err) {
      toast.error('Erro ViaCEP');
    } finally {
      setIsSearchingCep(false);
    }
  };

  const searchCoordinates = async () => {
    if (!formData.rua || !formData.numero || !formData.cidade) {
      toast.error('Preencha Rua, Número e Cidade.');
      return;
    }
    setIsSearchingCoords(true);
    try {
      const query = `${formData.rua}, ${formData.numero}, ${formData.bairro}, ${formData.cidade}, ${formData.estado}, Brasil`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setFormData(p => ({ ...p, latitude: lat, longitude: lon }));
        if (mapInstance.current && markerRef.current) {
            const newPos = L.latLng(parseFloat(lat), parseFloat(lon));
            markerRef.current.setLatLng(newPos);
            mapInstance.current.setView(newPos, 17);
        }
        toast.success('Coordenadas localizadas!');
      } else {
        toast.error('Não localizado.');
      }
    } catch (err) {
      toast.error('Erro Nominatim');
    } finally {
      setIsSearchingCoords(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!resolvedUnitId) {
        toast.error('Unidade não identificada. Selecione a loja no menu.');
        return;
      }

      // Descobre o nome_loja real desta unidade
      const match = user?.availableUnits?.find(
        (u) => u.id === resolvedUnitId
      );
      const nomeLojaReal = match?.nome_loja || selectedUnit || '';

      const dadosParaSalvar = {
        nome_loja: payload.nome_loja || nomeLojaReal,
        cep: payload.cep,
        rua: payload.rua,
        bairro: payload.bairro,
        cidade: payload.cidade,
        estado: payload.estado,
        numero: payload.numero,
        latitude: payload.latitude ? parseFloat(String(payload.latitude).replace(',', '.')) : null,
        longitude: payload.longitude ? parseFloat(String(payload.longitude).replace(',', '.')) : null,
        unidade: nomeLojaReal,   // guarda o nome real
        unidade_id: resolvedUnitId, // guarda o UUID real
      };

      // Upsert com base em unidade_id — garante um único registro por loja, sem duplicados
      const { error } = await supabase
        .from('system_config')
        .upsert(dadosParaSalvar as any, { onConflict: 'unidade_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Dados salvos!');
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-card border border-border rounded-lg p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b pb-4">
          <Store className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold font-mono">Configuração Física da Loja</h2>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Nome da Unidade</Label>
                <Input value={formData.nome_loja} onChange={e => setFormData(p => ({...p, nome_loja: e.target.value}))} />
            </div>
            <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                    <Input value={formData.cep} onChange={e => setFormData(p => ({...p, cep: e.target.value}))} />
                    <Button onClick={searchCep} disabled={isSearchingCep}>{isSearchingCep ? <Loader2 className="animate-spin" /> : 'Buscar'}</Button>
                </div>
            </div>
          </div>

          <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                  <Label>Rua</Label>
                  <Input value={formData.rua} onChange={e => setFormData(p => ({...p, rua: e.target.value}))} />
              </div>
              <div className="w-24 space-y-2">
                  <Label>Número</Label>
                  <Input value={formData.numero} onChange={e => setFormData(p => ({...p, numero: e.target.value}))} />
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={formData.bairro} onChange={e => setFormData(p => ({...p, bairro: e.target.value}))} />
              </div>
              <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={formData.cidade} onChange={e => setFormData(p => ({...p, cidade: e.target.value}))} />
              </div>
              <div className="space-y-2">
                  <Label>UF</Label>
                  <Input maxLength={2} value={formData.estado} onChange={e => setFormData(p => ({...p, estado: e.target.value.toUpperCase()}))} />
              </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Navigation className="w-4 h-4" /> Ajuste o Pin no Mapa </Label>
            <div ref={mapRef} className="w-full h-[300px] rounded-lg border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="flex justify-between">Latitude <Button variant="ghost" size="sm" className="h-4 text-[10px]" onClick={searchCoordinates} disabled={isSearchingCoords}>Localizar Auto</Button></Label>
                <Input value={formData.latitude} onChange={e => setFormData(p => ({...p, latitude: e.target.value}))} />
            </div>
            <div className="space-y-2">
                <Label>Longitude</Label>
                <Input value={formData.longitude} onChange={e => setFormData(p => ({...p, longitude: e.target.value}))} />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar Dados'}</Button>
        </div>
      </div>
      {user?.franquiaId && <FranquiaBagsSection franquiaId={user.franquiaId} />}
    </div>
  );
}

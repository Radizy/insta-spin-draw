import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Store, MapPin } from 'lucide-react';
import { FranquiaBagsSection } from './FranquiaBagsSection';

export function DadosDaLoja() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome_loja: '',
    cep: '',
    endereco: '',
    numero: '',
    latitude: '',
    longitude: '',
  });

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSearchingCoords, setIsSearchingCoords] = useState(false);

  // Load config data
  const { data: config, isLoading } = useQuery({
    queryKey: ['system-config', selectedUnit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .eq('unidade', selectedUnit)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!selectedUnit,
  });

  useEffect(() => {
    if (config) {
      setFormData({
        nome_loja: config.nome_loja || '',
        cep: (config as any).cep || '',
        endereco: (config as any).endereco || '',
        numero: (config as any).numero || '',
        latitude: (config as any).latitude ? String((config as any).latitude) : '',
        longitude: (config as any).longitude ? String((config as any).longitude) : '',
      });
    } else {
      setFormData({
        nome_loja: '', cep: '', endereco: '', numero: '', latitude: '', longitude: ''
      });
    }
  }, [config]);

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
        const enderecoCompleto = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        setFormData(prev => ({
          ...prev,
          endereco: enderecoCompleto,
        }));
        toast.success('Endereço localizado via CEP!');
      }
    } catch (err) {
      toast.error('Erro ao consultar o ViaCEP');
      console.error(err);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const searchCoordinates = async () => {
    if (!formData.endereco || !formData.numero) {
      toast.error('Preencha o endereço completo e o número primeiro.');
      return;
    }

    setIsSearchingCoords(true);
    try {
      const parts = formData.endereco.split(',');
      const logradouro = parts[0]?.trim();
      const resto = parts.slice(1).join(',').trim();
      const addressQuery = `${logradouro}, ${formData.numero}, ${resto}, Brasil`;
      
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        setFormData(p => ({
          ...p,
          latitude: data[0].lat,
          longitude: data[0].lon
        }));
        toast.success('Coordenadas auto-preenchidas com sucesso!');
      } else {
        toast.error('Não foi possível achar as coordenadas para este endereço.');
      }
    } catch (err) {
      toast.error('Erro na busca de coordenadas da loja.');
      console.error(err);
    } finally {
      setIsSearchingCoords(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (!selectedUnit) return;

      const dadosParaSalvar = {
        nome_loja: payload.nome_loja,
        cep: payload.cep,
        endereco: payload.endereco,
        numero: payload.numero,
        latitude: payload.latitude ? parseFloat(payload.latitude.replace(',', '.')) : null,
        longitude: payload.longitude ? parseFloat(payload.longitude.replace(',', '.')) : null,
      };

      if (config) {
        const { error } = await supabase
          .from('system_config')
          .update(dadosParaSalvar as any)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_config')
          .insert({ unidade: selectedUnit, ...dadosParaSalvar } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Dados da loja salvos com sucesso!');
    },
    onError: (err) => {
      toast.error('Erro ao salvar. Lembre-se de rodar a migration de banco de dados.');
      console.error(err);
    },
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-card border border-border rounded-lg p-6 space-y-6 shadow-sm">
        <div className="flex items-center gap-3 border-b pb-4">
          <Store className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold font-mono">Dados e Endereço da Loja</h2>
            <p className="text-sm text-muted-foreground">Configurações globais e localização no mapa</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Nome da Loja */}
          <div className="space-y-2">
            <Label htmlFor="nome-loja">Nome da Unidade (Mostrado na TV e no Sisfood)</Label>
            <Input
              id="nome-loja"
              value={formData.nome_loja}
              onChange={(e) => setFormData(p => ({ ...p, nome_loja: e.target.value }))}
              placeholder="Ex: FilaLab Matriz"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CEP */}
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <div className="flex gap-2">
                <Input
                  id="cep"
                  maxLength={9}
                  value={formData.cep}
                  onChange={(e) => setFormData(p => ({ ...p, cep: e.target.value }))}
                  placeholder="00000-000"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={searchCep}
                  disabled={isSearchingCep || formData.cep.length < 8}
                >
                  {isSearchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo (ViaCEP)</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData(p => ({ ...p, endereco: e.target.value }))}
                placeholder="Rua, Bairro, Cidade - UF"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Numero */}
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => setFormData(p => ({ ...p, numero: e.target.value }))}
                placeholder="Ex: 123"
              />
            </div>

            {/* Latitude e Longitude */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="latitude">Latitude</Label>
                <Button 
                   type="button" 
                   variant="ghost" 
                   size="sm" 
                   className="h-6 text-xs px-2 text-primary hover:bg-primary/10"
                   onClick={searchCoordinates}
                   disabled={isSearchingCoords || !formData.endereco || !formData.numero}
                >
                  {isSearchingCoords ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <MapPin className="w-3 h-3 mr-1" />}
                  Buscar Auto
                </Button>
              </div>
              <Input
                id="latitude"
                type="text"
                value={formData.latitude}
                onChange={(e) => setFormData(p => ({ ...p, latitude: e.target.value }))}
                placeholder="-23.5505"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center h-6">
                 <Label htmlFor="longitude">Longitude</Label>
              </div>
              <Input
                id="longitude"
                type="text"
                value={formData.longitude}
                onChange={(e) => setFormData(p => ({ ...p, longitude: e.target.value }))}
                placeholder="-46.6333"
              />
            </div>
          </div>

          <div className="bg-secondary/30 border border-border p-3 rounded-md flex items-start gap-3 mt-4">
            <MapPin className="min-w-[20px] h-5 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>Importante:</strong> Pegue as coordenadas (Latitude e Longitude) exatas da sua loja no Google Maps para que a exibição da base no rastreamento dos motoboys (Painel do Roteirista) fique mais precisa.
            </p>
          </div>

        </div>

        <div className="pt-4 border-t flex justify-end">
          <Button
            type="button"
            className="min-w-[150px]"
            onClick={() => saveMutation.mutate(formData)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              'Salvar Dados da Loja'
            )}
          </Button>
        </div>
      </div>

      {user?.franquiaId && (
        <div className="mt-8">
          <FranquiaBagsSection franquiaId={user.franquiaId} />
        </div>
      )}
    </div>
  );
}

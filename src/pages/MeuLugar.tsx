import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getMotoboyPosition, updateEntregador, Unidade } from '@/lib/api';
import { Pizza, User, Loader2, Search, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InstallPWAButton } from '@/components/InstallPWAButton';
import { PushNotificationToggle } from '@/components/PushNotificationToggle';

export default function MeuLugar() {
  const [telefone, setTelefone] = useState('');
  const [searchTelefone, setSearchTelefone] = useState('');
  const [erroGeo, setErroGeo] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Heartbeat: atualização automática a cada 5 minutos
  const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutos

  const { data: positionData, isLoading, isError, refetch } = useQuery({
    queryKey: ['motoboy-position', searchTelefone],
    queryFn: () => getMotoboyPosition(searchTelefone),
    enabled: searchTelefone.length >= 10,
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  // Heartbeat: força refetch a cada 5 minutos
  useEffect(() => {
    if (!searchTelefone) return;

    const interval = setInterval(() => {
      refetch();
      console.log('Heartbeat: atualizando posição...');
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [searchTelefone, refetch]);

  const updateGpsMutation = useMutation({
    mutationFn: ({ id, lat, lng }: { id: string; lat: number; lng: number }) =>
      updateEntregador(id, { lat, lng, last_location_time: new Date().toISOString() }),
  });

  // Rastreio contínuo em background se tiver o ID logado
  useEffect(() => {
    const entregadorId = (positionData as any)?.id;
    if (!entregadorId) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateGpsMutation.mutate({
          id: entregadorId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Erro no rastreio do GPS:', error);
      },
      // enableHighAccuracy gasta mais bateria. Reduzido para false para modo econômico.
      // E aumentado timeout para 5 minutos.
      { enableHighAccuracy: false, timeout: 300000, maximumAge: 300000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [(positionData as any)?.id]);

  // Listener para capturar o Push Token do App Android (APK)
  useEffect(() => {
    const entregadorId = (positionData as any)?.id;
    if (!entregadorId) return;

    const handlePushToken = async (event: any) => {
      const token = event.detail;
      if (token) {
        console.log('App Push Token recebido:', token);
        try {
          await updateGpsMutation.mutateAsync({
            id: entregadorId,
            lat: (positionData as any).lat, // Mantém lat atual se houver
            lng: (positionData as any).lng, // Mantém lng atual se houver
            // @ts-ignore - campo novo na migração
            expo_push_token: token
          });
          console.log('Push Token salvo com sucesso no perfil do motoboy.');
        } catch (err) {
          console.error('Erro ao salvar Push Token:', err);
        }
      }
    };

    window.addEventListener('ExpoPushTokenReceived', handlePushToken);
    return () => window.removeEventListener('ExpoPushTokenReceived', handlePushToken);
  }, [(positionData as any)?.id, positionData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setErroGeo('');

    if (telefone.length < 10) return;

    if (!('geolocation' in navigator)) {
      setErroGeo('Erro de conexão com o servidor (503). Ative a localização e tente novamente.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setSearchTelefone(telefone.trim());
      },
      (error) => {
        console.error('GPS Negado ou timeout:', error);
        setIsLocating(false);
        setErroGeo('Erro de conexão com o servidor (503). Ative a localização e tente novamente.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const renderResult = () => {
    if (!searchTelefone) return null;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (isError || !positionData || !positionData.nome) {
      return (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <p className="text-xl text-muted-foreground">Motoboy não encontrado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifique o telefone e a unidade
          </p>
        </div>
      );
    }

    // Status não é disponível
    if (positionData.status === 'chamado') {
      return (
        <div className="text-center py-12 bg-accent rounded-xl animate-pulse">
          <Clock className="w-20 h-20 mx-auto mb-4 text-accent-foreground" />
          <h2 className="text-4xl font-bold font-mono text-accent-foreground mb-2">
            {positionData.nome}
          </h2>
          <p className="text-2xl text-accent-foreground">
            🔔 VOCÊ FOI CHAMADO!
          </p>
          <p className="text-lg text-accent-foreground/80 mt-4">
            Dirija-se ao balcão imediatamente
          </p>
        </div>
      );
    }

    if (positionData.status === 'entregando') {
      return (
        <div className="text-center py-12 bg-status-delivering/20 border border-status-delivering rounded-xl">
          <Truck className="w-20 h-20 mx-auto mb-4 text-status-delivering" />
          <h2 className="text-3xl font-bold font-mono mb-2">{positionData.nome}</h2>
          <p className="text-xl text-muted-foreground">Você está em entrega</p>
          <p className="text-sm text-muted-foreground mt-4">
            Se você já retornou, peça ao roteirista para dar seu "Retorno" no painel.
          </p>
        </div>
      );
    }

    // Disponível na fila
    if (positionData.position) {
      return (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <div className="w-32 h-32 rounded-full bg-primary mx-auto mb-6 flex items-center justify-center">
            <span className="text-6xl font-bold font-mono text-primary-foreground">
              {positionData.position}
            </span>
          </div>
          <h2 className="text-3xl font-bold font-mono mb-2">{positionData.nome}</h2>
          <p className="text-xl text-muted-foreground">
            Você está na posição <strong>{positionData.position}</strong> da fila
          </p>
          {positionData.position === 1 && (
            <p className="text-lg text-primary mt-4 font-semibold">
              🎉 Você é o próximo!
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-12 bg-card border border-border rounded-xl">
        <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-2xl font-bold mb-2">{positionData.nome}</h2>
        <p className="text-muted-foreground">
          Você não está na fila no momento
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Verifique seu turno e dias de trabalho
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Logo sem link */}
      <header className="border-b border-border bg-card/50">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Pizza className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-mono font-bold text-lg">FilaLab</span>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-mono mb-2">Meu Lugar na Fila</h1>
          <p className="text-muted-foreground">
            Consulte sua posição atual na fila de entregas
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-8">
          {/* Apenas telefone - unidade é detectada automaticamente pelo sistema */}
          <div className="space-y-2">
            <Label htmlFor="telefone">Seu telefone (com DDD)</Label>
            <Input
              id="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
              placeholder="11999999999"
              className="text-lg h-12"
            />
            {erroGeo && (
              <p className="text-sm font-medium text-destructive mt-2">{erroGeo}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg gap-2"
            disabled={telefone.length < 10 || isLocating}
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            {isLocating ? 'Conectando...' : 'Consultar'}
          </Button>
        </form>

        {/* Result */}
        {renderResult()}

        {searchTelefone && !isLoading && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Atualização automática a cada 10 segundos
          </p>
        )}

        {/* Notificações e PWA */}
        {positionData && (positionData as any).id && (
          <div className="mt-8">
            <PushNotificationToggle entregadorId={(positionData as any).id} />
          </div>
        )}
      </div>

      <div className="container py-4 max-w-md mx-auto">
        <InstallPWAButton />
      </div>
    </div>
  );
}

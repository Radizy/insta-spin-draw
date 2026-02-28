import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchEntregadores,
  fetchHistoricoEntregas,
  fetchSystemConfig,
  fetchGlobalConfig,
  updateEntregador,
  shouldShowInQueue,
  Entregador,
  HORARIO_EXPEDIENTE,
  sendWhatsAppMessage,
  SenhaPagamento,
  fetchSenhasPagamento,
} from '@/lib/api';
import { User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTTS } from '@/hooks/useTTS';
import { CheckinModal } from '@/components/CheckinModal';
import { TVCallAnimation } from '@/components/TVCallAnimation';
import { WeatherSlide } from '@/components/WeatherSlide';
import { TopRankWidget } from '@/components/tv/TopRankWidget';
import { QueueSidebarWidget } from '@/components/tv/QueueSidebarWidget';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CALL_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const RINGTONE_OPTIONS = [
  { id: 'classic_short', name: 'Clássico curto (padrão)', url: DEFAULT_CALL_AUDIO_URL },
  { id: 'digital_ping', name: 'Ping digital suave', url: 'https://assets.mixkit.co/active_storage/sfx/2850/2850-preview.mp3' },
  { id: 'doorbell_soft', name: 'Campainha suave', url: 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3' },
  { id: 'notification_fast', name: 'Notificação rápida', url: 'https://assets.mixkit.co/active_storage/sfx/2770/2770-preview.mp3' },
  { id: 'alert_subtle', name: 'Alerta sutil', url: 'https://assets.mixkit.co/active_storage/sfx/2735/2735-preview.mp3' },
  { id: 'bell_soft', name: 'Sino suave', url: 'https://assets.mixkit.co/active_storage/sfx/2577/2577-preview.mp3' },
  { id: 'game_level_up', name: 'Som tipo app de entregas 1', url: 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3' },
  { id: 'game_notification', name: 'Som tipo app de entregas 2', url: 'https://assets.mixkit.co/active_storage/sfx/512/512-preview.mp3' },
  { id: 'soft_pop', name: 'Pop suave', url: 'https://assets.mixkit.co/active_storage/sfx/2351/2351-preview.mp3' },
  { id: 'short_whistle', name: 'Apito curto', url: 'https://assets.mixkit.co/active_storage/sfx/2772/2772-preview.mp3' },
] as const;

const DISPLAY_TIME_MS = 15000;

function getRingtoneUrl(ringtoneId?: string | null) {
  if (!ringtoneId) return DEFAULT_CALL_AUDIO_URL;
  const found = RINGTONE_OPTIONS.find((r) => r.id === ringtoneId);
  return found?.url || DEFAULT_CALL_AUDIO_URL;
}

interface CalledEntregadorInfo {
  entregador: Entregador;
  hasBebida: boolean;
}

const getExpedientePeriod = () => {
  const now = new Date();
  const currentHour = now.getHours();
  let dataInicio: Date;
  let dataFim: Date;

  if (currentHour < 3) {
    dataInicio = new Date(now);
    dataInicio.setDate(dataInicio.getDate() - 1);
    dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
    dataFim = new Date(now);
    dataFim.setHours(3, 0, 0, 0);
  } else {
    dataInicio = new Date(now);
    dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);
    dataFim = new Date(now);
    dataFim.setDate(dataFim.getDate() + 1);
    dataFim.setHours(3, 0, 0, 0);
  }
  return { dataInicio, dataFim };
};

export default function TV() {
  const { selectedUnit, setSelectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // State Hooks
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [displayingCalled, setDisplayingCalled] = useState<CalledEntregadorInfo | null>(null);
  const [displayingPagamento, setDisplayingPagamento] = useState<SenhaPagamento | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [interactionNeeded, setInteractionNeeded] = useState(true);

  // Ref Hooks
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPagamentoIdRef = useRef<string | null>(null);
  const isDisplayingRef = useRef(false);
  const handleCallAnnouncementRef = useRef<(entregador: Entregador, hasBebida: boolean) => Promise<void>>(async () => { });
  const updateMutationRef = useRef<any>(null);
  const broadcastChannelRef = useRef<any>(null);

  // External Hooks
  const { speak } = useTTS();

  // Query Hooks
  const { data: systemName } = useQuery({
    queryKey: ['global-config', 'system_name'],
    queryFn: () => fetchGlobalConfig('system_name'),
  });

  const { data: systemConfig } = useQuery({
    queryKey: ['system-config', selectedUnit],
    queryFn: () => fetchSystemConfig(selectedUnit as any),
    enabled: !!selectedUnit,
  });

  const { data: unidadeData } = useQuery({
    queryKey: ['unidade-cidade-clima', user?.unidadeId],
    queryFn: async () => {
      if (!user?.unidadeId) return null;
      const { data, error } = await supabase.from('unidades').select('cidade_clima, exibir_fila_tv').eq('id', user.unidadeId).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.unidadeId && !!selectedUnit,
  });

  const { data: franquiaConfig } = useQuery({
    queryKey: ['franquia-config-tv', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return { config_pagamento: null };
      const { data, error } = await supabase.from('franquias').select('config_pagamento').eq('id', user.franquiaId).maybeSingle();
      if (error) throw error;
      return (data as any) || { config_pagamento: null };
    },
    enabled: !!user?.franquiaId,
  });

  const { data: tvPlaylist = [] } = useQuery({
    queryKey: ['tv-playlist', user?.unidadeId],
    queryFn: async () => {
      if (!user?.unidadeId) return [];
      const { data, error } = await supabase.from('tv_playlist').select('*').eq('unidade_id', user.unidadeId).eq('ativo', true).order('ordem', { ascending: true });
      if (error) return [];
      return data;
    },
    enabled: !!user?.unidadeId,
    refetchInterval: 30000,
  });

  const { data: entregadores = [], refetch } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'tv'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit as any }),
    enabled: !!selectedUnit,
    refetchInterval: 5000,
  });

  const { dataInicio, dataFim } = getExpedientePeriod();
  const { data: historico = [], refetch: refetchHistorico } = useQuery({
    queryKey: ['historico-rank', selectedUnit, dataInicio.toISOString()],
    queryFn: () => fetchHistoricoEntregas({
      unidade: selectedUnit as any,
      dataInicio: dataInicio.toISOString(),
      dataFim: dataFim.toISOString(),
    }),
    enabled: !!selectedUnit,
    refetchInterval: 10000,
  });

  const { data: senhasPagamento = [] } = useQuery({
    queryKey: ['senhas-pagamento-tv', user?.unidadeId],
    queryFn: () => fetchSenhasPagamento(user?.unidadeId!),
    enabled: !!user?.unidadeId,
    refetchInterval: 5000,
  });

  const { data: franquiaBagTipos = [] } = useQuery({
    queryKey: ['franquia-bag-tipos', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return [];
      const { data, error } = await supabase.from('franquia_bag_tipos').select('*').eq('franquia_id', user.franquiaId).eq('ativo', true).order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.franquiaId,
  });

  // Mutation Hook
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) => updateEntregador(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['entregadores'] }); },
  });

  // Memo Hooks
  const top3 = useMemo(() => {
    const mapa: Record<string, any> = {};
    entregadores.forEach((e) => { if (e.ativo) mapa[e.id] = { id: e.id, nome: e.nome, saidas: 0, entregas: 0, firstAt: null }; });
    historico.forEach((h) => {
      const item = mapa[h.entregador_id];
      if (!item) return;
      item.saidas += 1;
      if (h.hora_retorno) item.entregas += 1;
      const createdAt = new Date(h.created_at);
      if (!item.firstAt || createdAt < item.firstAt) item.firstAt = createdAt;
    });
    const lista = Object.values(mapa);
    if (lista.length === 0) return [];
    const maxSaidas = Math.max(...lista.map((i) => i.saidas));
    if (maxSaidas === 0) return [...lista].sort(() => Math.random() - 0.5).slice(0, 3);
    return lista.sort((a, b) => {
      if (b.saidas !== a.saidas) return b.saidas - a.saidas;
      if (a.firstAt && b.firstAt) return a.firstAt.getTime() - b.firstAt.getTime();
      return a.nome.localeCompare(b.nome);
    }).slice(0, 3);
  }, [historico, entregadores]);

  // Sync Ref Hooks
  useEffect(() => { updateMutationRef.current = updateMutation; }, [updateMutation]);

  // Early Returns AFTER all hooks
  if (!user || !user.unidade) return <Navigate to="/" replace />;
  if (!selectedUnit) return <Navigate to="/" replace />;

  const displayName = systemName || 'FilaLab';
  const storeName = systemConfig?.nome_loja || selectedUnit as string;

  // Helprs e Callbacks
  const playOneAudio = useCallback(async (path: string, volume: number): Promise<boolean> => {
    try {
      const safeVolume = Math.min(1, Math.max(0, volume));

      // Se for uma URL absoluta, toca diretamente
      if (path.startsWith('http')) {
        return new Promise((resolve) => {
          const audio = new Audio(path);
          audio.volume = safeVolume;
          audio.onended = () => resolve(true);
          audio.onerror = () => resolve(false);
          audio.play().catch(() => resolve(false));
        });
      }

      // Lógica de bucket refinada
      let bucket = 'motoboy_voices';
      let filePath = path;

      if (path.startsWith('audios_sistema/')) {
        bucket = 'audios_sistema';
        filePath = path.replace('audios_sistema/', '');
      } else if (path.includes('/')) {
        // Se o caminho for 'UUID/arquivo.mp3', o bucket continua sendo 'motoboy_voices'
        // pois é a estrutura interna desse bucket. 
        // Não removemos o prefixo pois ele faz parte do filePath no bucket motoboy_voices.
        bucket = 'motoboy_voices';
        filePath = path;
      }

      const { data, error } = await supabase.storage.from(bucket).download(filePath);
      if (error) {
        console.error(`[TV] Erro ao baixar áudio (${bucket}/${filePath}):`, error);
        return false;
      }

      if (data) {
        return new Promise((resolve) => {
          const audioUrl = URL.createObjectURL(data);
          const audio = new Audio(audioUrl);
          audio.volume = safeVolume;
          audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(true); };
          audio.onerror = (e) => {
            console.error('[TV] Erro ao reproduzir audio blob:', e);
            URL.revokeObjectURL(audioUrl);
            resolve(false);
          };
          audio.play().catch((err) => {
            console.error('[TV] Erro ao iniciar play() do blob:', err);
            URL.revokeObjectURL(audioUrl);
            resolve(false);
          });
        });
      }
    } catch (err) {
      console.error('[TV] Erro fatal na execução do áudio:', err);
    }
    return false;
  }, []);

  const playAudioSequence = useCallback(async (entregador: Entregador, bagId: string | null, hasBebida: boolean) => {
    const volume = ((franquiaConfig?.config_pagamento as any)?.tv_tts?.volume ?? 100) / 100;
    const pause = () => new Promise((r) => setTimeout(r, 300));
    let playedNome = false;
    if (entregador.tts_voice_path) playedNome = await playOneAudio(entregador.tts_voice_path, volume);
    if (!playedNome) {
      await speak(`É a vez de ${entregador.nome}`, { enabled: true, volume: volume * 100, voice_model: 'browser_clara' });
      await pause();
    }
    if (bagId) {
      console.log('[TV] Processando audio da bag:', bagId);
      const bagTipo = franquiaBagTipos.find((b) => b.id === bagId || b.nome === bagId);
      console.log('[TV] Tipo de bag encontrado:', bagTipo);

      let playedBag = false;
      const bagPath = `${user.franquiaId}/bags/${bagTipo?.id}.mp3`;
      console.log('[TV] Tentando reproduzir audio da bag:', bagPath);
      playedBag = await playOneAudio(bagPath, volume);

      if (!playedBag) {
        console.log('[TV] Audio da bag falhou ou inexistente, usando TTS para bag');
        await speak(`Pegue a ${bagTipo?.nome || bagId}`, { enabled: true, volume: volume * 100, voice_model: 'browser_clara' });
        await pause();
      }
    }
    if (hasBebida) {
      const bebidaPath = `${user.franquiaId}/bebida.mp3`;
      console.log('[TV] Tentando reproduzir áudio de bebida:', bebidaPath);
      const playedBebida = await playOneAudio(bebidaPath, volume);
      if (!playedBebida) await speak('Tem bebida nas comandas', { enabled: true, volume: volume * 100, voice_model: 'browser_clara' });
    }
  }, [franquiaConfig, franquiaBagTipos, speak, playOneAudio, user.franquiaId]);

  const handleCallAnnouncement = useCallback(async (entregador: Entregador, hasBebida: boolean) => {
    if (isMuted) return;
    const tvTts = (franquiaConfig?.config_pagamento as any)?.tv_tts;

    // 1. Toca o Ringtone ANTES de tudo
    if (audioRef.current) {
      try {
        const ringtoneUrl = getRingtoneUrl(tvTts?.ringtone_id);
        console.log('[TV] Iniciando ringtone pre-chamada:', ringtoneUrl);
        audioRef.current.volume = (tvTts?.volume ?? 100) / 100;
        audioRef.current.src = ringtoneUrl;

        await new Promise<void>((resolve) => {
          const el = audioRef.current!;
          const done = () => {
            console.log(`[TV] Ringtone finalizado. Duração: ${el.duration}s`);
            el.removeEventListener('ended', done);
            el.removeEventListener('error', done);
            resolve();
          };
          el.addEventListener('ended', done);
          el.addEventListener('error', (e) => {
            console.error('[TV] Erro no elemento de áudio do ringtone:', e);
            done();
          });
          el.play().catch((err) => {
            console.error('[TV] Erro ao dar play no ringtone:', err);
            done();
          });
        });
      } catch (err) {
        console.error('[TV] Falha fatal ao tocar ringtone:', err);
      }
    }

    // 2. Inicia a sequência de áudio (Nome -> Bag -> Bebida)
    await playAudioSequence(entregador, entregador.tipo_bag, hasBebida);
  }, [isMuted, playAudioSequence, franquiaConfig]);

  useEffect(() => { handleCallAnnouncementRef.current = handleCallAnnouncement; }, [handleCallAnnouncement]);

  const triggerCall = useCallback((entregador: Entregador, hasBebida: boolean, isForce = false) => {
    if (isDisplayingRef.current && !isForce) {
      console.log(`[TV] Chamada ignorada para ${entregador.nome} (já existe animação em curso)`);
      return;
    }
    try {
      console.log(`[TV] Iniciando triggerCall para ${entregador.nome} (isForce: ${isForce})`);
      isDisplayingRef.current = true;
      setDisplayingCalled({ entregador, hasBebida });
      handleCallAnnouncementRef.current(entregador, hasBebida);

      if (broadcastChannelRef.current) {
        console.log(`[TV] Enviando confirmação tv-call-started para ${entregador.nome}`);
        broadcastChannelRef.current.send({
          type: 'broadcast',
          event: 'tv-call-started',
          payload: { entregadorId: entregador.id }
        }).catch((err: any) => console.error('[TV] Erro ao enviar confirmação:', err));
      } else {
        console.error('[TV] Canal de broadcast não inicializado ao tentar enviar confirmação');
      }

      setTimeout(() => {
        updateMutationRef.current?.mutate({ id: entregador.id, data: { status: 'entregando', hora_saida: new Date().toISOString() } });
        setDisplayingCalled(null);
        setTimeout(() => {
          isDisplayingRef.current = false;
          console.log('[TV] Animação finalizada, isDisplayingRef = false');
          resetIdleTimer(); // Garante o delay do screensaver após a chamada
        }, 3000);
      }, DISPLAY_TIME_MS);
    } catch (err) {
      console.error('[TV] Erro no triggerCall:', err);
      isDisplayingRef.current = false; setDisplayingCalled(null);
    }
  }, [selectedUnit]);

  // Effects
  useEffect(() => {
    const it = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(it);
  }, []);

  useEffect(() => {
    const channel = supabase.channel('tv-calls').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'entregadores', filter: `unidade=eq.${selectedUnit}` }, (payload) => {
      const newData = payload.new as any;
      if (newData.status === 'chamado') {
        const hasBebida = newData.has_bebida || localStorage.getItem(`bebida_${newData.id}`) === 'true';
        triggerCall(newData, hasBebida);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedUnit, triggerCall]);

  useEffect(() => {
    if (!selectedUnit) return;

    console.log(`[TV] Inicializando canal de broadcast estável para unidade ${selectedUnit}`);
    const channel = supabase.channel(`tv-calls-broadcast-${selectedUnit}`);

    channel
      .on('broadcast', { event: 'tv-call-retry' }, (payload) => {
        console.log('[TV] Sinal tv-call-retry recebido via canal estável:', payload);
        const { entregadorId } = payload.payload;
        const e = entregadores.find(ent => ent.id === entregadorId);
        if (e) {
          const hasBebida = localStorage.getItem(`bebida_${e.id}`) === 'true';
          triggerCall(e, hasBebida, true);
          toast.info(`Re-tentativa de chamada para ${e.nome}`);
        }
      })
      .subscribe((status) => {
        console.log(`[TV] Status da subscrição de broadcast: ${status}`);
        if (status === 'SUBSCRIBED') {
          broadcastChannelRef.current = channel;
        }
      });

    return () => {
      console.log('[TV] Removendo canal de broadcast estável');
      supabase.removeChannel(channel);
      broadcastChannelRef.current = null;
    };
  }, [selectedUnit, entregadores, triggerCall]);

  // Limpador de Cache (localStorage) Diário
  useEffect(() => {
    const lastCleanup = localStorage.getItem('tv_last_cleanup');
    const today = new Date().toISOString().split('T')[0];

    if (lastCleanup !== today) {
      console.log('[TV] Executando limpeza de cache diária...');
      // Remove chaves de estado de bebida antigas para não acumular
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('bebida_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('tv_last_cleanup', today);
    }
  }, []);

  useEffect(() => {
    const it = setInterval(() => {
      if (isDisplayingRef.current) return;
      const called = entregadores.filter(e => e.status === 'chamado');
      if (called.length > 0) {
        const e = called[0];
        const hasBebida = localStorage.getItem(`bebida_${e.id}`) === 'true';
        triggerCall(e, hasBebida);
      }
    }, 5000);
    return () => clearInterval(it);
  }, [entregadores, triggerCall]);

  useEffect(() => {
    const channel = supabase.channel('tv-pagamentos').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'senhas_pagamento', filter: `unidade_id=eq.${user?.unidadeId}` }, (payload) => {
      const nova = payload.new as SenhaPagamento;
      if (nova.status === 'chamado' && nova.id !== lastPagamentoIdRef.current) {
        lastPagamentoIdRef.current = nova.id; setDisplayingPagamento(nova);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.unidadeId]);

  useEffect(() => {
    const it = senhasPagamento.find(s => s.status === 'chamado' && s.id !== lastPagamentoIdRef.current);
    if (it) { lastPagamentoIdRef.current = it.id; setDisplayingPagamento(it); }
  }, [senhasPagamento]);

  useEffect(() => {
    if (!displayingPagamento) return;
    const t = setTimeout(() => setDisplayingPagamento(null), 4000);
    return () => clearTimeout(t);
  }, [displayingPagamento]);

  useEffect(() => {
    if (!isIdle || tvPlaylist.length === 0 || displayingCalled || displayingPagamento) return;
    const slide = tvPlaylist[currentSlideIndex];
    if (!slide) { setCurrentSlideIndex(0); return; }
    const t = setTimeout(() => setCurrentSlideIndex((prev) => (prev + 1) % tvPlaylist.length), (slide.duracao || 15) * 1000);
    return () => clearTimeout(t);
  }, [isIdle, tvPlaylist, currentSlideIndex, displayingCalled, displayingPagamento]);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    const time = ((franquiaConfig?.config_pagamento as any)?.tv_tts?.idle_time_seconds || 15) * 1000;
    idleTimeoutRef.current = setTimeout(() => setIsIdle(true), time);
  }, [franquiaConfig]);

  useEffect(() => {
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    resetIdleTimer();
    return () => {
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('touchstart', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [resetIdleTimer]);

  const activeEntregadores = entregadores.filter(e => e.ativo);
  const availableQueue = activeEntregadores.filter((e) => e.status === 'disponivel' && (shouldShowInQueue(e) || (e.fila_posicao && (new Date().getTime() - new Date(e.fila_posicao).getTime()) / 3600000 <= 24)));
  const calledEntregadores = activeEntregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = activeEntregadores.filter((e) => e.status === 'entregando');

  const renderPlaylistSlide = (isActive: boolean) => {
    const slide = tvPlaylist[currentSlideIndex];
    if (!slide) return null;

    const renderMedia = () => {
      switch (slide.tipo) {
        case 'clima': return <WeatherSlide cidadeInput={unidadeData?.cidade_clima} />;
        case 'top_rank': return <TopRankWidget unidadeId={selectedUnit as string} availableQueue={availableQueue} deliveringQueue={deliveringQueue} lastCalled={calledEntregadores[0] || deliveringQueue[0] || null} />;
        case 'imagem': return <img src={slide.url || ''} className="w-full h-full object-cover" />;
        case 'video': return <video src={slide.url || ''} loop className="w-full h-full object-cover" ref={el => { if (el) { el.volume = (slide.volume || 0) / 100; el.muted = !slide.volume || !isActive; if (isActive) el.play().catch(() => { }); else el.pause(); } }} />;
        default: return null;
      }
    };

    const media = renderMedia();

    // Se exibir_fila_tv estiver ativo e não for o slide nativo de rank, mescla a fila lateral
    if (unidadeData?.exibir_fila_tv && slide.tipo !== 'top_rank') {
      return (
        <div className="w-full h-full bg-slate-950 flex text-slate-50 relative overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            {media}
          </div>
          <div className="w-px bg-white/10 self-stretch flex-shrink-0 z-20" />
          <QueueSidebarWidget
            availableQueue={availableQueue}
            deliveringQueue={deliveringQueue}
            lastCalled={calledEntregadores[0] || deliveringQueue[0] || null}
          />
        </div>
      );
    }

    return media;
  };

  const handleReturn = async (e: Entregador) => {
    try {
      await updateMutation.mutateAsync({ id: e.id, data: { status: 'disponivel', fila_posicao: new Date().toISOString(), hora_saida: null } });
      const pos = availableQueue.length + 1;
      const whatsapp = (franquiaConfig?.config_pagamento?.modulos_ativos || []).includes('whatsapp');
      if (whatsapp && e.whatsapp_ativo !== false) await sendWhatsAppMessage(e.telefone, `Retorno confirmado! Posição ${pos}.`, { franquiaId: user?.franquiaId ?? null, unidadeId: null });
      refetch(); refetchHistorico(); toast.success(`Retorno confirmado! Posição ${pos}.`);
    } catch { toast.error('Erro ao retornar'); }
  };

  const handleCheckin = async (e: Entregador) => {
    try {
      await updateMutation.mutateAsync({ id: e.id, data: { ativo: true, status: 'disponivel', fila_posicao: new Date().toISOString() } });
      toast.success(`${e.nome} entrou na fila!`); setCheckinOpen(false); refetch();
    } catch { toast.error('Erro ao fazer check-in'); }
  };

  const buildTvTexts = (nome: string, bag?: string, senha?: string) => {
    const prompts = (franquiaConfig?.config_pagamento as any)?.tv_prompts || {};
    const c = (prompts.entrega_chamada || 'É a sua vez {nome}').replace('{nome}', nome);
    const b = (prompts.entrega_bag || 'Pegue a {bag}').replace('{bag}', bag || 'sua bag');
    const p = (prompts.pagamento_chamada || 'Senha {senha}\n{nome}...').replace('{nome}', nome).replace('{senha}', senha || '').replace('{unidade}', storeName);
    return { chamadaText: c, bagText: b, pagamentoText: p };
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {interactionNeeded && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white text-center px-4">
          <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.5)] glow-pulse cursor-pointer" onClick={() => setInteractionNeeded(false)}>
            <Volume2 className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-4xl font-black mb-4">INICIAR TV</h1>
          <p className="text-slate-400 text-lg max-w-md">Para permitir notificações de voz e sons, precisamos que você interaja com a página.</p>
          <Button onClick={() => setInteractionNeeded(false)} size="lg" className="mt-8 px-12 h-16 text-xl font-bold bg-emerald-600 hover:bg-emerald-500 rounded-full">ATIVAR SOM E TV</Button>
        </div>
      )}
      <audio ref={audioRef} preload="auto" />
      <TVCallAnimation
        show={!!displayingCalled || !!displayingPagamento}
        tipo={displayingPagamento ? 'PAGAMENTO' : 'ENTREGA'}
        nomeMotoboy={displayingPagamento?.entregador_nome || displayingCalled?.entregador.nome || ''}
        bagNome={displayingPagamento ? undefined : franquiaBagTipos.find(b => b.id === displayingCalled?.entregador.tipo_bag)?.nome || displayingCalled?.entregador.tipo_bag}
        callPhrase={displayingPagamento ? buildTvTexts(displayingPagamento.entregador_nome!, undefined, displayingPagamento.numero_senha).pagamentoText : displayingCalled ? buildTvTexts(displayingCalled.entregador.nome, franquiaBagTipos.find(b => b.id === displayingCalled.entregador.tipo_bag)?.nome).chamadaText : undefined}
        bagPhrase={displayingCalled ? buildTvTexts(displayingCalled.entregador.nome, franquiaBagTipos.find(b => b.id === displayingCalled.entregador.tipo_bag)?.nome).bagText : undefined}
        hasBebida={displayingCalled?.hasBebida || false}
        onComplete={() => (displayingPagamento ? setDisplayingPagamento(null) : setDisplayingCalled(null))}
      />
      {tvPlaylist.length > 0 && <div className={`fixed inset-0 z-40 bg-black transition-opacity duration-1000 ${isIdle && !displayingCalled && !displayingPagamento ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>{renderPlaylistSlide(isIdle && !displayingCalled && !displayingPagamento)}</div>}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 font-mono font-bold text-xl">🍕 {displayName} <span className="mx-2 text-border">|</span> <span className="text-muted-foreground">{storeName}</span></div>
        <div className="flex items-center gap-4">
          <Button onClick={() => setCheckinOpen(true)} variant="outline" className="gap-2"><UserPlus className="w-5 h-5" /> Check-in</Button>
          <button onClick={() => setIsMuted(!isMuted)} className="p-3 rounded-lg bg-secondary">{isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}</button>
        </div>
      </header>
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2">
        <div className="p-8 border-r border-border">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-status-available" /> Fila ({availableQueue.length})</h2>
          <div className="space-y-4">{availableQueue.map((e, i) => <div key={e.id} className="flex items-center gap-4 bg-card border p-4 rounded-xl shadow-sm"><div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-bold text-xl">{i + 1}</div><p className="text-xl font-semibold flex-1">{e.nome}</p></div>)}</div>
        </div>
        <div className="p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-status-delivering" /> Em Entrega ({deliveringQueue.length})</h2>
          <div className="space-y-4">{deliveringQueue.map(e => <div key={e.id} className="flex items-center gap-4 bg-card border p-4 rounded-xl shadow-sm"><div className="w-12 h-12 rounded-full bg-status-delivering/20 flex items-center justify-center text-status-delivering"><User /></div><p className="text-xl font-semibold flex-1">{e.nome}</p><Button onClick={() => handleReturn(e)} variant="outline" size="sm">Retornar</Button></div>)}</div>
        </div>
      </div>
      <CheckinModal open={checkinOpen} onOpenChange={setCheckinOpen} entregadores={entregadores} onCheckin={handleCheckin} isLoading={false} />
    </div>
  );
}
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
import { Pizza, User, Volume2, VolumeX, RotateCcw, Package, UserPlus, Trophy, Wine } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTTS } from '@/hooks/useTTS';
import { CheckinModal } from '@/components/CheckinModal';
import { TVCallAnimation } from '@/components/TVCallAnimation';
import { WeatherSlide } from '@/components/WeatherSlide';
import { TopRankWidget } from '@/components/tv/TopRankWidget';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CALL_AUDIO_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const RINGTONE_OPTIONS = [
  {
    id: 'classic_short',
    name: 'Clássico curto (padrão)',
    url: DEFAULT_CALL_AUDIO_URL,
  },
  {
    id: 'digital_ping',
    name: 'Ping digital suave',
    url: 'https://assets.mixkit.co/active_storage/sfx/2850/2850-preview.mp3',
  },
  {
    id: 'doorbell_soft',
    name: 'Campainha suave',
    url: 'https://assets.mixkit.co/active_storage/sfx/2868/2868-preview.mp3',
  },
  {
    id: 'notification_fast',
    name: 'Notificação rápida',
    url: 'https://assets.mixkit.co/active_storage/sfx/2770/2770-preview.mp3',
  },
  {
    id: 'alert_subtle',
    name: 'Alerta sutil',
    url: 'https://assets.mixkit.co/active_storage/sfx/2735/2735-preview.mp3',
  },
  {
    id: 'bell_soft',
    name: 'Sino suave',
    url: 'https://assets.mixkit.co/active_storage/sfx/2577/2577-preview.mp3',
  },
  {
    id: 'game_level_up',
    name: 'Som tipo app de entregas 1',
    url: 'https://assets.mixkit.co/active_storage/sfx/2010/2010-preview.mp3',
  },
  {
    id: 'game_notification',
    name: 'Som tipo app de entregas 2',
    url: 'https://assets.mixkit.co/active_storage/sfx/512/512-preview.mp3',
  },
  {
    id: 'soft_pop',
    name: 'Pop suave',
    url: 'https://assets.mixkit.co/active_storage/sfx/2351/2351-preview.mp3',
  },
  {
    id: 'short_whistle',
    name: 'Apito curto',
    url: 'https://assets.mixkit.co/active_storage/sfx/2772/2772-preview.mp3',
  },
] as const;

const DISPLAY_TIME_MS = 15000; // 15 segundos na tela

function getRingtoneUrl(ringtoneId?: string | null) {
  if (!ringtoneId) return DEFAULT_CALL_AUDIO_URL;
  const found = RINGTONE_OPTIONS.find((r) => r.id === ringtoneId);
  return found?.url || DEFAULT_CALL_AUDIO_URL;
}
interface CalledEntregadorInfo {
  entregador: Entregador;
  hasBebida: boolean;
}

export default function TV() {
  const { selectedUnit, setSelectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [displayingCalled, setDisplayingCalled] = useState<CalledEntregadorInfo | null>(null);
  const [displayingPagamento, setDisplayingPagamento] = useState<SenhaPagamento | null>(null);
  const [showDeliveries, setShowDeliveries] = useState(false); // Sempre false - não oscila mais
  const { speak } = useTTS();
  const lastCacheClean = useRef<number>(Date.now());
  const lastCallTime = useRef<number>(0);
  const processedCallsRef = useRef<Set<string>>(new Set());
  const lastPagamentoIdRef = useRef<string | null>(null);
  const handleCallAnnouncementRef = useRef<(entregador: Entregador, hasBebida: boolean) => Promise<void>>(async () => { });
  const updateMutationRef = useRef<typeof updateMutation>(null as any);

  const [callQueue, setCallQueue] = useState<CalledEntregadorInfo[]>([]);
  const isProcessingRef = useRef(false);
  const interruptDisplayRef = useRef<(() => void) | null>(null);

  // TODOS os hooks em cima para evitar React Hooks Violation
  useEffect(() => {
    if (user?.unidade && !selectedUnit) {
      setSelectedUnit(user.unidade as any);
    }
  }, [user, selectedUnit, setSelectedUnit]);

  // Early returns depositados após os hooks iniciais
  if (!user || !user.unidade) {
    return <Navigate to="/" replace />;
  }

  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }


  // Query for system config (nome da loja)
  const { data: systemConfig } = useQuery({
    queryKey: ['system-config', selectedUnit],
    queryFn: () => fetchSystemConfig(selectedUnit),
  });

  // Query for global config (nome do sistema)
  const { data: systemName } = useQuery({
    queryKey: ['global-config', 'system_name'],
    queryFn: () => fetchGlobalConfig('system_name'),
  });

  const displayName = systemName || 'FilaLab';
  const storeName = systemConfig?.nome_loja || selectedUnit;

  // Buscar cidade do clima
  const { data: unidadeData } = useQuery({
    queryKey: ['unidade-cidade-clima', user?.unidadeId],
    queryFn: async () => {
      if (!user?.unidadeId) return null;
      const { data, error } = await supabase
        .from('unidades')
        .select('cidade_clima')
        .eq('id', user.unidadeId)
        .maybeSingle();
      if (error) {
        console.error('Erro ao buscar unidade:', error);
        return null;
      }
      return data;
    },
    enabled: !!selectedUnit,
  });

  // Configurações Globais da Loja e Prompts da TV (por franquia)
  const { data: franquiaConfig } = useQuery<{ config_pagamento: any | null }>({
    queryKey: ['franquia-config-tv', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return { config_pagamento: null };
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || { config_pagamento: null };
    },
    enabled: !!user?.franquiaId,
  });

  // Buscar Playlist da TV da Unidade
  const { data: tvPlaylist = [] } = useQuery({
    queryKey: ['tv-playlist', user?.unidadeId],
    queryFn: async () => {
      if (!user?.unidadeId) return [];
      const { data, error } = await supabase
        .from('tv_playlist')
        .select('*')
        .eq('unidade_id', user.unidadeId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) {
        console.error('Erro ao listar playlist:', error);
        return [];
      }
      return data;
    },
    enabled: !!user?.unidadeId,
    refetchInterval: 30000, // Atualiza a playlist a cada 30s
  });

  // Estado de inatividade (Screensaver)
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleActivity = () => {
      setIsIdle(false);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

      const configOcioso = ((franquiaConfig?.config_pagamento as any)?.tv_tts?.idle_time_seconds || 15) * 1000;
      idleTimeoutRef.current = setTimeout(() => setIsIdle(true), configOcioso); // X segundos ocioso entra screensaver
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('click', handleActivity);

    handleActivity();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [franquiaConfig]);

  // Lógica de Rotação da Playlist
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    // Só pausa no mouse se não tiver rolagem de video longo. Mas a especificação é Chamada > Mouse > Playlist.
    // Assim que der isIdle e não tiver Chamadas na tela, roda a Playlist.
    if (!isIdle || tvPlaylist.length === 0 || displayingCalled || displayingPagamento) {
      return;
    }

    const currentSlide = tvPlaylist[currentSlideIndex];
    if (!currentSlide) {
      setCurrentSlideIndex(0);
      return;
    }

    const durationMs = (currentSlide.duracao || 15) * 1000;

    const timer = setTimeout(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % tvPlaylist.length);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [isIdle, tvPlaylist, currentSlideIndex, displayingCalled, displayingPagamento]);

  const renderPlaylistSlide = (isActive: boolean) => {
    if (tvPlaylist.length === 0) return null;
    const slide = tvPlaylist[currentSlideIndex];
    if (!slide) return null;

    const getVideoId = (url: string) => {
      const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?]+)/);
      return match ? match[1] : '';
    };

    const getPlaylistId = (url: string) => {
      const match = url.match(/[?&]list=([^&]+)/);
      return match ? match[1] : '';
    };

    switch (slide.tipo) {
      case 'clima':
        return <WeatherSlide cidadeInput={unidadeData?.cidade_clima} />;
      case 'top_rank':
        return <TopRankWidget unidadeId={selectedUnit} />;
      case 'imagem':
        return <img src={slide.url || ''} alt="Slide" className="w-full h-full object-cover" />;
      case 'video':
        return (
          <video
            src={slide.url || ''}
            loop
            className="w-full h-full object-cover"
            ref={(el) => {
              if (el) {
                el.volume = (slide.volume || 0) / 100;
                el.muted = !slide.volume || !isActive;
                if (isActive) {
                  el.play().catch(() => { });
                } else {
                  el.pause();
                }
              }
            }}
          />
        );
      case 'youtube': {
        const urlStr = slide.url || '';
        const videoId = getVideoId(urlStr);
        const playlistId = getPlaylistId(urlStr);

        let embedUrl = `https://www.youtube.com/embed/`;
        if (playlistId) {
          embedUrl += `${videoId || 'videoseries'}?list=${playlistId}&`;
        } else {
          embedUrl += `${videoId}?playlist=${videoId}&`;
        }

        embedUrl += `autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1&origin=${window.location.origin}`;

        return (
          <iframe
            key={slide.id}
            src={embedUrl}
            className="w-full h-full border-0 pointer-events-none"
            allow="autoplay; encrypted-media"
            ref={(el) => {
              if (el && el.contentWindow) {
                el.contentWindow.postMessage(JSON.stringify({ event: 'command', func: isActive ? 'playVideo' : 'pauseVideo' }), '*');
                if (!isActive || !slide.volume) {
                  el.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute' }), '*');
                } else {
                  el.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute' }), '*');
                  el.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [slide.volume || 100] }), '*');
                }
              }
            }}
          />
        );
      }
      default:
        return null;
    }
  };

  // Query for fetching entregadores - atualiza a cada 10 segundos
  const { data: entregadores = [], refetch } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'tv'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit }),
    refetchInterval: 10000, // 10 segundos
  });

  // Calcular período do expediente atual para o rank
  const getExpedientePeriod = () => {
    const now = new Date();
    const currentHour = now.getHours();

    let dataInicio: Date;
    let dataFim: Date;

    if (currentHour < 3) {
      // Antes das 03:00 - expediente de ontem
      dataInicio = new Date(now);
      dataInicio.setDate(dataInicio.getDate() - 1);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);

      dataFim = new Date(now);
      dataFim.setHours(3, 0, 0, 0);
    } else if (currentHour >= HORARIO_EXPEDIENTE.inicio) {
      // Após 17:00 - expediente de hoje
      dataInicio = new Date(now);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);

      dataFim = new Date(now);
      dataFim.setDate(dataFim.getDate() + 1);
      dataFim.setHours(3, 0, 0, 0);
    } else {
      // Entre 03:00 e 17:00 - não há expediente ativo
      dataInicio = new Date(now);
      dataInicio.setHours(HORARIO_EXPEDIENTE.inicio, 0, 0, 0);

      dataFim = new Date(now);
      dataFim.setDate(dataFim.getDate() + 1);
      dataFim.setHours(3, 0, 0, 0);
    }

    return { dataInicio, dataFim };
  };

  const { dataInicio, dataFim } = getExpedientePeriod();

  // Query para histórico do ranking
  const { data: historico = [], refetch: refetchHistorico } = useQuery({
    queryKey: ['historico-rank', selectedUnit, dataInicio.toISOString()],
    queryFn: () =>
      fetchHistoricoEntregas({
        unidade: selectedUnit,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
      }),
    refetchInterval: 10000, // Atualiza a cada 10 segundos
  });

  // Query para senhas de pagamento (para mostrar chamado na TV)
  const { data: senhasPagamento = [] } = useQuery({
    queryKey: ['senhas-pagamento-tv', user.unidadeId],
    queryFn: () => fetchSenhasPagamento(user.unidadeId!),
    enabled: !!user.unidadeId,
    refetchInterval: 5000,
  });

  // Calcular top 3 por saídas e entregas (com desempate por quem chegou primeiro)
  const top3 = useMemo(() => {
    type RankItem = {
      id: string;
      nome: string;
      saidas: number;
      entregas: number; // entregas = saídas com hora_retorno preenchida
      firstAt: Date | null;
    };

    const mapa: Record<string, RankItem> = {};

    // Inicializa com todos entregadores ativos da unidade, com 0 saídas/entregas
    entregadores.forEach((e) => {
      if (!e.ativo) return;
      mapa[e.id] = {
        id: e.id,
        nome: e.nome,
        saidas: 0,
        entregas: 0,
        firstAt: null,
      };
    });

    // Conta saídas e entregas do período
    historico.forEach((h) => {
      const item = mapa[h.entregador_id];
      if (!item) return;

      item.saidas += 1;
      // Considera entrega feita se tem hora_retorno
      if (h.hora_retorno) {
        item.entregas += 1;
      }
      const createdAt = new Date(h.created_at);
      if (!item.firstAt || createdAt < item.firstAt) {
        item.firstAt = createdAt;
      }
    });

    const lista = Object.values(mapa);

    if (lista.length === 0) return [];

    const maxSaidas = Math.max(...lista.map((i) => i.saidas));

    // Se todo mundo estiver zerado, mostrar em ordem aleatória
    if (maxSaidas === 0) {
      const shuffled = [...lista].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, 3).map(({ nome, saidas, entregas }) => ({ nome, saidas, entregas }));
    }

    // Caso normal: ordena por mais saídas e, em caso de empate,
    // quem chegou primeiro nesse número (menor firstAt) vem na frente
    return lista
      .sort((a, b) => {
        if (b.saidas !== a.saidas) return b.saidas - a.saidas;
        if (a.firstAt && b.firstAt) return a.firstAt.getTime() - b.firstAt.getTime();
        if (a.firstAt) return -1;
        if (b.firstAt) return 1;
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, 3)
      .map(({ nome, saidas, entregas }) => ({ nome, saidas, entregas }));
  }, [historico, entregadores]);

  // Mutation for updating status
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    },
  });

  // Verifica se tem check-in recente (nas últimas 24 horas)
  const hasRecentCheckin = (entregador: Entregador) => {
    if (!entregador.fila_posicao) return false;
    const now = new Date().getTime();
    const filaTime = new Date(entregador.fila_posicao).getTime();
    const diffHours = (now - filaTime) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  // Filter entregadores (with shift/workday check for available, mas liberando quem fez check-in recente)
  const activeEntregadores = entregadores.filter(e => e.ativo);
  const availableQueue = activeEntregadores
    .filter((e) => e.status === 'disponivel' && (shouldShowInQueue(e) || hasRecentCheckin(e)));
  const calledEntregadores = activeEntregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = activeEntregadores.filter((e) => e.status === 'entregando');

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Removed: Oscillation between saídas and entregas
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     setShowDeliveries(prev => !prev);
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, []);

  // Limpeza de cache a cada 1 hora (sem apagar a fila)
  useEffect(() => {
    const checkCacheClean = () => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (now - lastCacheClean.current >= oneHour) {
        queryClient.invalidateQueries({
          queryKey: ['entregadores'],
          refetchType: 'active'
        });
        lastCacheClean.current = now;
        console.log('Cache limpo às', new Date().toLocaleTimeString());
      }
    };

    const interval = setInterval(checkCacheClean, 60000);
    return () => clearInterval(interval);
  }, [queryClient]);

  // Tipos de BAG configurados para a franquia do usuário (para exibir nome correto na TV)
  const { data: franquiaBagTipos = [] } = useQuery<{
    id: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    franquia_id: string;
    audio_url: string | null;
  }[]>({
    queryKey: ['franquia-bag-tipos', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return [];
      const { data, error } = await supabase
        .from('franquia_bag_tipos')
        .select('id, nome, descricao, ativo, franquia_id, audio_url')
        .eq('franquia_id', user.franquiaId)
        .eq('ativo', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.franquiaId,
  });

  const defaultTvPrompts = {
    entrega_chamada: 'É a sua vez {nome}',
    entrega_bag: 'Pegue a {bag}',
    pagamento_chamada:
      'Senha {senha}\n{nome}, é a sua vez de receber!\nVá até o caixa imediatamente.',
  };

  const tvPrompts = (franquiaConfig?.config_pagamento as any)?.tv_prompts || defaultTvPrompts;

  // Atualizar configuração de TTS em tempo real quando a franquia for alterada
  useEffect(() => {
    if (!user?.franquiaId) return;

    const channel = supabase
      .channel('tv-franquia-config')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'franquias',
          filter: `id=eq.${user.franquiaId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ['franquia-config-tv', user.franquiaId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.franquiaId, queryClient]);

  const defaultTvTtsConfig = {
    enabled: true,
    volume: 100,
    voice_model: 'system' as const,
    ringtone_id: 'classic_short' as const,
  };

  const baseTvTtsConfig = (franquiaConfig?.config_pagamento as any)?.tv_tts || defaultTvTtsConfig;
  const tvTtsConfig = {
    ...defaultTvTtsConfig,
    ...baseTvTtsConfig,
    franquiaId: user?.franquiaId,
  };

  const buildTvTexts = (nome: string, bagName?: string, senha?: string) => {
    const chamadaTemplate = tvPrompts.entrega_chamada || defaultTvPrompts.entrega_chamada;
    const bagTemplate = tvPrompts.entrega_bag || defaultTvPrompts.entrega_bag;
    const pagamentoTemplate = tvPrompts.pagamento_chamada || defaultTvPrompts.pagamento_chamada;

    const chamadaText = chamadaTemplate.replace('{nome}', nome);
    const bagText = bagTemplate.replace('{bag}', bagName || 'sua bag');
    const pagamentoText = pagamentoTemplate
      .replace('{nome}', nome)
      .replace('{senha}', senha || '')
      .replace('{unidade}', systemConfig?.nome_loja || systemName || 'sua loja');

    return { chamadaText, bagText, pagamentoText };
  };

  // Helper: toca um áudio de URL ou storage path. Retorna true se tocou com sucesso.
  // Protegido contra DOMException: play() failed because o user didn't interact (Autoplay Policy)
  const playOneAudio = useCallback(async (path: string, volume: number): Promise<boolean> => {
    try {
      const safeVolume = Math.min(1, Math.max(0, volume));
      if (path.startsWith('http')) {
        const success = await new Promise<boolean>((resolve) => {
          const audio = new Audio(path);
          audio.volume = safeVolume;
          audio.onended = () => resolve(true);
          audio.onerror = () => {
            console.warn('TV: Erro de rede ou indisponível URL:', path);
            resolve(false);
          };
          audio.play().catch(e => {
            console.warn('TV: Audio bloqueado pelo navegador (URL)', e);
            resolve(false);
          });
        });
        return success;
      } else {
        const { data } = await supabase.storage.from('motoboy_voices').download(path);
        if (data) {
          const success = await new Promise<boolean>((resolve) => {
            const audioUrl = URL.createObjectURL(data);
            const audio = new Audio(audioUrl);
            audio.volume = safeVolume;
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              resolve(true);
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              console.warn('TV: Erro ao tocar blob local:', path);
              resolve(false);
            };
            audio.play().catch(e => {
              URL.revokeObjectURL(audioUrl);
              console.warn('TV: Audio bloqueado pelo navegador (Storage)', e);
              resolve(false);
            });
          });
          return success;
        }
      }
    } catch (e) {
      console.warn('Áudio try-catch skipado:', path, e);
    }
    return false;
  }, []);

  const playAudioSequence = useCallback(
    async (entregador: Entregador, bagId: string | null, hasBebida: boolean) => {
      const franquiaId = user?.franquiaId;
      const volume = Math.min(1, Math.max(0, (tvTtsConfig.volume ?? 100) / 100));
      const pause = () => new Promise((r) => setTimeout(r, 300));

      // ---- 1. ÁUDIO DO MOTOBOY (prioridade: tts_voice_path pré-gravado/ElevenLabs) ----
      let playedNome = false;
      if (entregador.tts_voice_path) {
        playedNome = await playOneAudio(entregador.tts_voice_path, volume);
        if (playedNome) await pause();
      }
      // Fallback TTS para nome se não tocou
      if (!playedNome) {
        await speak(`É a vez de ${entregador.nome}`, {
          enabled: true,
          volume: tvTtsConfig.volume ?? 100,
          voice_model: 'browser_clara',
        });
        await pause();
      }

      // ---- 2. ÁUDIO DA BAG (prioridade: audio_url da galeria > storage path) ----
      if (bagId && franquiaId) {
        let playedBag = false;
        // O bagId vindo de entregador.tipo_bag pode ser o NOME ou o ID, dependendo de como foi salvo
        const bagTipo = franquiaBagTipos.find((b) => b.id === bagId || b.nome === bagId);
        const actualBagId = bagTipo?.id || bagId;

        // Primeiro tenta audio_url da galeria (vinculado no painel)
        if (bagTipo?.audio_url) {
          playedBag = await playOneAudio(bagTipo.audio_url, volume);
        }
        // Se não tem audio_url ou falhou, tenta storage path
        if (!playedBag) {
          playedBag = await playOneAudio(`${franquiaId}/bags/${actualBagId}.mp3`, volume);
        }
        if (playedBag) {
          await pause();
        } else {
          // Fallback TTS para bag
          const bagName = bagTipo?.nome || bagId;
          await speak(`Pegue a ${bagName}`, {
            enabled: true,
            volume: tvTtsConfig.volume ?? 100,
            voice_model: 'browser_clara',
          });
          await pause();
        }
      }

      // ---- 3. ÁUDIO DE BEBIDA (prioridade: storage path pré-gravado) ----
      if (hasBebida && franquiaId) {
        let playedBebida = await playOneAudio(`${franquiaId}/bebida.mp3`, volume);
        if (!playedBebida) {
          // Fallback TTS
          await speak('Tem bebida nas comandas', {
            enabled: true,
            volume: tvTtsConfig.volume ?? 100,
            voice_model: 'browser_clara',
          });
        }
      }
    },
    [user?.franquiaId, tvTtsConfig.volume, franquiaBagTipos, speak, playOneAudio],
  );

  // Play audio and TTS quando alguém é chamado
  const handleCallAnnouncement = useCallback(
    async (entregador: Entregador, hasBebida: boolean) => {
      if (isMuted) return;

      // Primeiro toca o toque completo, depois os áudios de voz
      if (audioRef.current) {
        try {
          const ringVolume = Math.min(1, Math.max(0, (tvTtsConfig.volume ?? 100) / 100));
          audioRef.current.volume = ringVolume;
          audioRef.current.currentTime = 0;
          audioRef.current.src = getRingtoneUrl(tvTtsConfig.ringtone_id);

          await new Promise<void>((resolve) => {
            const audioElement = audioRef.current!;

            const cleanup = () => {
              audioElement.removeEventListener('ended', onEnded);
              audioElement.removeEventListener('error', onError);
            };

            const onEnded = () => {
              cleanup();
              resolve();
            };

            const onError = () => {
              cleanup();
              resolve();
            };

            audioElement.addEventListener('ended', onEnded);
            audioElement.addEventListener('error', onError);

            audioElement.play().catch(() => {
              cleanup();
              resolve();
            });
          });
        } catch {
          // Se der erro, apenas segue para a sequência de voz
        }
      }

      // Tocar sequência de áudios pré-gravados (nome -> bag -> bebida)
      await playAudioSequence(entregador, entregador.tipo_bag, hasBebida);
    },
    [isMuted, playAudioSequence, tvTtsConfig.volume, tvTtsConfig.ringtone_id],
  );

  // Manter refs atualizados para evitar reconexões do canal realtime
  useEffect(() => {
    handleCallAnnouncementRef.current = handleCallAnnouncement;
  }, [handleCallAnnouncement]);

  useEffect(() => {
    updateMutationRef.current = updateMutation;
  }, [updateMutation]);

  // ============================================================
  // PREVENÇÃO REALTIME: apenas adiciona na fila, sem travar
  // Refs garantem que o canal seja reativo, porém estável.
  // ============================================================
  useEffect(() => {
    const channel = supabase
      .channel('tv-calls')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entregadores',
          filter: `unidade=eq.${selectedUnit}`,
        },
        (payload) => {
          const newData = payload.new as Entregador & { has_bebida?: boolean };

          // Apenas processa se for chamado e ainda não exibido na sessão atual
          if (newData.status === 'chamado' && !processedCallsRef.current.has(newData.id)) {
            const hasBebidaFromDb = (newData as any).has_bebida ?? false;
            const hasBebidaFromStorage =
              typeof window !== 'undefined'
                ? localStorage.getItem(`bebida_${newData.id}`) === 'true'
                : false;
            const hasBebida = hasBebidaFromDb || hasBebidaFromStorage;

            processedCallsRef.current.add(newData.id);

            // Interrompe imediatamente se existir timer display ativo
            if (interruptDisplayRef.current) {
              interruptDisplayRef.current();
              interruptDisplayRef.current = null;
            }

            setCallQueue((prev) => [...prev, { entregador: newData, hasBebida }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUnit]); // Apenas ativa reconexão quando muda a Unidade.

  // ============================================================
  // FALLBACK (POLLING): apenas adiciona na fila de processos
  // ============================================================
  useEffect(() => {
    calledEntregadores.forEach((entregador) => {
      if (!processedCallsRef.current.has(entregador.id)) {
        const hasBebidaFromStorage =
          typeof window !== 'undefined'
            ? localStorage.getItem(`bebida_${entregador.id}`) === 'true'
            : false;

        processedCallsRef.current.add(entregador.id);

        if (interruptDisplayRef.current) {
          interruptDisplayRef.current();
          interruptDisplayRef.current = null;
        }

        setCallQueue((prev) => [...prev, { entregador, hasBebida: hasBebidaFromStorage }]);
      }
    });

    // Limpar IDs de entregadores que não estão mais chamados
    processedCallsRef.current.forEach((id) => {
      const stillCalled = calledEntregadores.find((e) => e.id === id);
      const nowDelivering = deliveringQueue.find((e) => e.id === id);
      if (!stillCalled && !nowDelivering) {
        processedCallsRef.current.delete(id);
      }
    });
  }, [calledEntregadores, deliveringQueue]);

  // ============================================================
  // PROCESSAMENTO SEQUENCIAL
  // Lida um por um na callQueue e respeita bloqueios de áudio.
  // ============================================================
  useEffect(() => {
    if (callQueue.length === 0 || isProcessingRef.current || displayingPagamento) return;

    const processNext = async () => {
      isProcessingRef.current = true;
      const nextCall = callQueue[0];
      const { entregador, hasBebida } = nextCall;

      setDisplayingPagamento(null);
      setDisplayingCalled(nextCall);

      // 1. Tocar array de áudios (sequencial, se o navegador bloquear, catch silencioso resolve logo)
      try {
        // Se o áudio demorar demais (>10s), cortamos ele para a tela não travar pra sempre
        await Promise.race([
          handleCallAnnouncementRef.current(entregador, hasBebida),
          new Promise<void>((r) => setTimeout(r, 12000))
        ]);
      } catch (err) {
        console.error('TV: Erro no áudio da fila, ignorando...', err);
      }

      // 2. Reseta o timer de inatividade (screensaver) disparando um evento
      window.dispatchEvent(new Event('mousemove'));

      // 3. Atualiza Status pro bd para Em Entrega
      updateMutationRef.current.mutate({
        id: entregador.id,
        data: {
          status: 'entregando',
          hora_saida: new Date().toISOString(),
        },
      });

      // 4. Finaliza a animação ("volta para a tela mostrando a fila atual")
      setDisplayingCalled(null);

      // Pequeno delay pra dar respiro visual antes da próxima chamada ser processada
      await new Promise(r => setTimeout(r, 2000));

      // 5. Libera ID da sessão
      processedCallsRef.current.delete(entregador.id);
      setCallQueue(prev => prev.slice(1));
      isProcessingRef.current = false;
    };

    processNext().catch(err => {
      console.error("TV: Erro crítico ao processar fila", err);
      setCallQueue(prev => prev.slice(1));
      isProcessingRef.current = false;
    });

  }, [callQueue, displayingPagamento]);

  // Escutar chamadas de pagamento para TV via realtime e também via polling
  useEffect(() => {
    if (!user?.unidadeId) return;

    const pagamentosChannel = supabase
      .channel('tv-pagamentos')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'senhas_pagamento',
          filter: `unidade_id=eq.${user.unidadeId}`,
        },
        (payload) => {
          const novaSenha = payload.new as SenhaPagamento;
          if (novaSenha.status === 'chamado' && novaSenha.id !== lastPagamentoIdRef.current) {
            lastPagamentoIdRef.current = novaSenha.id;
            setDisplayingPagamento(novaSenha);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pagamentosChannel);
    };
  }, [user?.unidadeId]);

  // Atualizar exibição de pagamento com base nas senhas carregadas (fallback via polling)
  useEffect(() => {
    const chamadaAtual = senhasPagamento.find(
      (s) => s.status === 'chamado' && s.id !== lastPagamentoIdRef.current,
    );

    if (chamadaAtual) {
      lastPagamentoIdRef.current = chamadaAtual.id;
      setDisplayingPagamento(chamadaAtual);
    }
  }, [senhasPagamento]);

  const handleReturn = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: {
          status: 'disponivel',
          fila_posicao: new Date().toISOString(),
          hora_saida: null,
        },
      });

      // Calcular nova posição estimada (fila atual + ele voltando)
      const newPosition = availableQueue.length + 1;

      // Mensagem de feedback para o motoboy via WhatsApp
      const isWhatsappAtivo = (franquiaConfig?.config_pagamento?.modulos_ativos || []).includes('whatsapp');
      if (isWhatsappAtivo && entregador.whatsapp_ativo !== false) {
        const whatsappMessage = `Retorno confirmado! Você está na posição ${newPosition} da fila. Valeu pelo trampo! Logo mais tem nova rota para você.`;
        await sendWhatsAppMessage(entregador.telefone, whatsappMessage, {
          franquiaId: user?.franquiaId ?? null,
          unidadeId: null,
        });
      }

      refetch();
      refetchHistorico();
      toast.success(
        `Retorno confirmado! Você está na posição ${newPosition} da fila. Valeu pelo trampo! Logo mais tem nova rota para você.`,
        { duration: 5000 }
      );
    } catch (error) {
      toast.error('Erro ao registrar retorno');
    }
  };

  const handleCheckin = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: {
          ativo: true,
          status: 'disponivel',
          fila_posicao: new Date().toISOString(),
        },
      });
      toast.success(`${entregador.nome} entrou na fila!`);
      setCheckinOpen(false);
      refetch();
    } catch (error) {
      toast.error('Erro ao fazer check-in');
    }
  };

  // Animação de chamada: a fila avança pelo timer do processNextCall
  const handleAnimationComplete = useCallback(() => { }, []);

  const handlePagamentoAnimationComplete = useCallback(() => {
    setDisplayingPagamento(null);
  }, []);

  // Garantir que chamadas de pagamento nunca fiquem presas na tela
  useEffect(() => {
    if (!displayingPagamento) return;

    const timeout = setTimeout(() => {
      setDisplayingPagamento(null);
    }, 4000);

    return () => clearTimeout(timeout);
  }, [displayingPagamento]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* Animação Premium de Chamada (entrega ou pagamento) */}
      <TVCallAnimation
        show={!!displayingCalled || !!displayingPagamento}
        tipo={displayingPagamento ? 'PAGAMENTO' : 'ENTREGA'}
        nomeMotoboy={
          displayingPagamento?.entregador_nome ||
          displayingCalled?.entregador.nome ||
          ''
        }
        bagNome={
          displayingPagamento
            ? undefined
            : (() => {
              const bagId = displayingCalled?.entregador.tipo_bag;
              if (!bagId) return undefined;
              return (
                franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId
              );
            })()
        }
        callPhrase={
          displayingPagamento && displayingPagamento.entregador_nome
            ? buildTvTexts(
              displayingPagamento.entregador_nome,
              undefined,
              displayingPagamento.numero_senha,
            ).pagamentoText
            : (!displayingPagamento && displayingCalled
              ? buildTvTexts(
                displayingCalled.entregador.nome,
                (() => {
                  const bagId = displayingCalled.entregador.tipo_bag;
                  if (!bagId) return undefined;
                  return franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId;
                })(),
              ).chamadaText
              : undefined)
        }
        bagPhrase={
          !displayingPagamento && displayingCalled
            ? buildTvTexts(displayingCalled.entregador.nome, (() => {
              const bagId = displayingCalled.entregador.tipo_bag;
              if (!bagId) return undefined;
              return franquiaBagTipos.find((b) => b.id === bagId)?.nome || bagId;
            })()).bagText
            : undefined
        }
        hasBebida={displayingCalled?.hasBebida || false}
        bebidaPhrase="🍹 Tem Bebida nas Comandas"
        onComplete={displayingPagamento ? handlePagamentoAnimationComplete : handleAnimationComplete}
      />

      {/* Screensaver Ocioso */}
      {tvPlaylist.length > 0 && (
        <div
          className={`fixed inset-0 z-40 bg-black transition-opacity duration-1000 ${isIdle && !displayingCalled && !displayingPagamento
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
            }`}
        >
          {renderPlaylistSlide(isIdle && !displayingCalled && !displayingPagamento)}
        </div>
      )}

      {/* Header - Logo sem link + faixa Top 5 */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card/50 overflow-hidden relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <span className="font-mono font-bold text-xl flex items-center gap-2">
              🍕 {displayName}
            </span>
            <span className="mx-3 text-border text-2xl font-light">|</span>
            <span className="font-medium text-lg text-muted-foreground mr-3">{storeName}</span>
          </div>
        </div>

        {/* Faixa Top 3 - Oscila entre saídas e entregas */}
        {top3.length > 0 && (
          <div className="flex-1 mx-8 hidden md:block">
            <div className="relative h-12 overflow-hidden rounded-full bg-secondary/70 border border-border">
              <div className="absolute inset-0 flex items-center gap-6 px-6">
                <span className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Os 3 que mais tiveram saídas
                </span>
                {top3.map((item, index) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const count = item.saidas; // Sempre mostra saídas
                  const label = 'saídas';
                  return (
                    <div
                      key={`${item.nome}-${index}`}
                      className="flex items-center gap-2 text-sm text-foreground whitespace-nowrap"
                    >
                      <span className="text-xl">{medals[index]}</span>
                      <span className="font-semibold">{item.nome}</span>
                      <span className="font-mono text-xs opacity-80 bg-background/40 px-2 py-0.5 rounded-full">{count} {label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Check-in button */}
          <Button
            onClick={() => setCheckinOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Check-in
          </Button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Volume2 className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-2 gap-0 relative">
        {/* Left Column - Queue */}
        <div className="border-b lg:border-b-0 lg:border-r border-border p-4 sm:p-6 lg:p-8 overflow-hidden">
          <h2 className="text-2xl font-bold font-mono mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-status-available" />
            Fila de Espera ({availableQueue.length})
          </h2>

          {availableQueue.length === 0 ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <p className="text-lg sm:text-xl text-muted-foreground">Nenhum entregador na fila</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {availableQueue.map((entregador, index) => (
                <div
                  key={entregador.id}
                  className="flex items-center gap-3 sm:gap-4 bg-card border border-border rounded-xl p-3 sm:p-4 animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-secondary flex items-center justify-center text-xl sm:text-2xl font-bold font-mono">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg sm:text-xl font-semibold truncate">
                      {entregador.nome}
                    </p>
                  </div>
                  <div className="w-3 h-3 rounded-full bg-status-available flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column - Em Entrega com botão Voltar para Fila */}
        <div className="p-4 sm:p-6 lg:p-8 overflow-hidden">
          <h2 className="text-2xl font-bold font-mono mb-4 sm:mb-6 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-status-delivering" />
            Em Entrega ({deliveringQueue.length})
          </h2>

          {deliveringQueue.length === 0 ? (
            <div className="flex items-center justify-center h-48 sm:h-64">
              <div className="text-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                  <User className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                </div>
                <p className="text-lg sm:text-xl text-muted-foreground">Nenhum entregador em entrega</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {deliveringQueue.map((entregador, index) => (
                <div
                  key={entregador.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-card border border-border rounded-xl p-3 sm:p-4"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="w-14 h-14 rounded-full bg-status-delivering/20 flex items-center justify-center mx-auto sm:mx-0">
                    <User className="w-7 h-7 text-status-delivering" />
                  </div>
                  <div className="flex-1 min-w-0 text-center sm:text-left">
                    <p className="text-lg sm:text-xl font-semibold truncate">{entregador.nome}</p>
                    {entregador.tipo_bag && (
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 text-sm text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span className="truncate">
                          {franquiaBagTipos.find((b) => b.id === entregador.tipo_bag)?.nome || entregador.tipo_bag}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={() => handleReturn(entregador)}
                    disabled={updateMutation.isPending}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto gap-2 text-base sm:text-lg px-4 sm:px-6"
                  >
                    <RotateCcw className="w-5 h-5" />
                    Voltar para Fila
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="px-8 py-3 border-t border-border bg-card/50 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Atualização automática a cada 10 segundos
        </span>
        <span className="text-sm text-muted-foreground font-mono">
          {currentTime.toLocaleTimeString('pt-BR')}
        </span>
      </footer>

      {/* Check-in Modal */}
      <CheckinModal
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        entregadores={entregadores}
        onCheckin={handleCheckin}
        isLoading={false}
      />
    </div>
  );
}
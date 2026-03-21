import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, BackButton } from '@/components/Layout';
import {
  fetchEntregadores,
  updateEntregador,
  sendWhatsAppMessage,
  createHistoricoEntrega,
  shouldShowInQueue,
  Entregador,
  TipoBag,
  sendDispatchWebhook,
  atualizarSaidaEntrega,
  resetDaily,
  registrarRetornoEntrega,
  hasRecentCheckin,
} from '@/lib/api';
import { useTraining } from '@/contexts/TrainingContext';
import { toast } from 'sonner';
import { Users, Loader2, Phone, GripVertical, SkipForward, UserMinus, LogOut, ArrowRight, MessageSquare, Map, MessageCircleOff, MessageCircle, XCircle, GraduationCap, ListFilter, AlertTriangle, Search, Clock, MapPin } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { NotAppearedModal } from '@/components/NotAppearedModal';
import { CallMotoboyModal } from '@/components/CallMotoboyModal';
import { ReturnToQueueModal } from '@/components/ReturnToQueueModal';
import { DeliveryTimer } from '@/components/DeliveryTimer';
import { supabase } from '@/integrations/supabase/client';
import { TvPaymentPreview } from '@/components/TvPaymentPreview';
import { MotoboyMapModal } from '@/components/MotoboyMapModal';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import QueueCard from '@/components/roteirista/QueueCard';

export default function Roteirista() {
  const { selectedUnit, setSelectedUnit } = useUnit();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Garante que a unidade selecionada tenha um valor inicial igual à unidade do usuário logado
  useEffect(() => {
    if (user?.unidade && !selectedUnit) {
      setSelectedUnit(user.unidade as any);
    }
  }, [user, selectedUnit, setSelectedUnit]);

  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [notAppearedOpen, setNotAppearedOpen] = useState(false);
  const [calledEntregador, setCalledEntregador] = useState<Entregador | null>(null);
  const [selectedEntregador, setSelectedEntregador] = useState<Entregador | null>(null);
  const [deliveryCount, setDeliveryCount] = useState(1);
  const [sisfoodComandas, setSisfoodComandas] = useState('');
  const [tipoBag, setTipoBag] = useState<TipoBag>('normal');
  const [hasBebida, setHasBebida] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [skipPosition, setSkipPosition] = useState<'ultimo' | 'proximo'>('proximo');
  const [isSending, setIsSending] = useState(false);

  const [callMotoboyOpen, setCallMotoboyOpen] = useState(false);
  const [returnToQueueOpen, setReturnToQueueOpen] = useState(false);
  const [actionEntregador, setActionEntregador] = useState<Entregador | null>(null);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tipos de BAG configurados para a franquia da unidade atual
  const { data: franquiaBagTipos = [], isLoading: isLoadingBags } = useQuery<{ id: string; nome: string; descricao: string | null; ativo: boolean; franquia_id: string; icone_url: string | null; }[]>({
    queryKey: ['franquia-bag-tipos', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) {
        return [];
      }
      const { data, error } = await supabase
        .from('franquia_bag_tipos')
        .select('id, nome, descricao, ativo, franquia_id, icone_url')
        .eq('franquia_id', user.franquiaId)
        .eq('ativo', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.franquiaId,
    staleTime: 1000 * 60 * 5, // 5 minutos (bag tipos mudam pouco)
  });

  const bagOptions = franquiaBagTipos.length
    ? franquiaBagTipos.map((b) => ({ id: b.id, label: b.nome, value: b.id, icone_url: b.icone_url }))
    : [
      { id: 'normal', label: 'BAG Normal', value: 'BAG Normal', icone_url: null },
      { id: 'metro', label: 'BAG Metro', value: 'BAG Metro', icone_url: null },
    ];

  // Config da unidade para pegar as coordenadas da loja
  const { data: systemConfig } = useQuery({
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

  // [x] Otimização de renderização React (React.memo, useMemo, useCallback)
  // [x] Refatoração da Roteirista.tsx em componentes menores (QueueCard)
  // [x] Otimização de cache e rede (TanStack Query staleTime/refetchInterval)
  // [x] Otimização de polling de senhas (10s)
  // [x] Otimização de polling de histórico e rank (5 min)
  // [x] Validação final e testes de performance
  const { isTrainingMode, fakeEntregadores, setFakeEntregadores, currentStep, setCurrentStep, fakeHistorico, setFakeHistorico, startTraining } = useTraining();

  // Query for fetching available entregadores
  const { data: realEntregadores = [], isLoading: isRealLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit, 'active'],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit, ativo: true }),
    refetchInterval: 10000, // Aumentado para 10s (reunindo com Realtime é suficiente)
    staleTime: 5000, 
    enabled: !!selectedUnit && !isTrainingMode,
  });

  const entregadores = isTrainingMode ? fakeEntregadores : realEntregadores;
  const isLoading = isTrainingMode ? false : isRealLoading;

  // Mutation for updating status
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Entregador> }) => {
      if (isTrainingMode) {
        setFakeEntregadores(fakeEntregadores.map(e => e.id === id ? { ...e, ...data } : e));
        return { data: { id, ...data }, error: null };
      }
      return updateEntregador(id, data);
    },
    onSuccess: () => {
      if (!isTrainingMode) {
        queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      }
    },
    onError: (e: any) => {
      toast.error('Erro ao atualizar entregador');
      console.error(e);
    },
  });




  const availableQueue = entregadores
    .filter((e) => e.status === 'disponivel' && (shouldShowInQueue(e) || hasRecentCheckin(e)));
  const calledQueue = entregadores.filter((e) => e.status === 'chamado');
  const deliveringQueue = entregadores.filter((e) => e.status === 'entregando');

  // Fallback: auto-transition from "chamado" to "entregando" after 60 seconds
  // The TV page is the primary handler (transitions after 15s animation).
  // This fallback ensures motoboys don't get stuck if TV is not open.
  useEffect(() => {
    const checkAndTransition = async () => {
      const now = new Date().getTime();

      for (const entregador of calledQueue) {
        const updatedAt = new Date(entregador.updated_at).getTime();
        const secondsPassed = (now - updatedAt) / 1000;

        // Only fallback after 60 seconds (TV handles it at ~15s)
        if (secondsPassed >= 60) {
          try {
            await updateMutation.mutateAsync({
              id: entregador.id,
              data: {
                status: 'entregando',
                hora_saida: new Date().toISOString(),
              },
            });
          } catch (error) {
            console.error('Erro ao auto-transicionar motoboy (fallback):', error);
          }
        }
      }
    };

    const interval = setInterval(checkAndTransition, 5000);

    return () => clearInterval(interval);
  }, [calledQueue, updateMutation]);

  // Contagem aproximada de saídas do dia para a unidade atual
  const { data: saidasHoje } = useQuery<{ count: number }>({
    queryKey: ['saidas-dia', selectedUnit],
    enabled: !!selectedUnit,
    queryFn: async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from('historico_entregas')
        .select('id', { count: 'exact', head: true })
        .eq('unidade', selectedUnit as string)
        .gte('created_at', hoje.toISOString());
      if (error) throw error;
      return { count: count ?? 0 };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 300000, // 5 minutos
  });

  // ======= Fila em Tempo Real do SISFOOD =======
  const [entregasNaFila, setEntregasNaFila] = useState<number | null>(null);
  const [pedidosFila, setPedidosFila] = useState<any[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  // Helper robusto para extrair timestamp de diversos formatos do Sisfood
  const parseSisfoodTime = (timeStr: string) => {
    if (!timeStr) return null;
    
    // Tenta extrair HH:mm via Regex
    const timeMatch = timeStr.match(/(\d{2}):(\d{2})/);
    if (!timeMatch) return null;
    
    const h = parseInt(timeMatch[1]);
    const m = parseInt(timeMatch[2]);
    
    const d = new Date();
    
    // Verifica se existe data "DD/MM" no formato
    const dateMatch = timeStr.match(/(\d{2})\/(\d{2})/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; // JS meses são 0-11
      d.setMonth(month, day);
      // Se a data resultante for no futuro (ex: virada de ano), retrocede 1 ano
      if (d > new Date()) d.setFullYear(d.getFullYear() - 1);
    }
    
    d.setHours(h, m, 0, 0);
    
    // Se não tinha data, mas o horário resultou no futuro (virada de dia), retrocede 1 dia
    if (!dateMatch && d > new Date()) {
      d.setDate(d.getDate() - 1);
    }
    
    return d.getTime();
  };

  useEffect(() => {
    if (!selectedUnit) return;

    let channel: any = null;

    const fetchFilaInicial = async () => {
      // Logic para mapear códigos em nomes reais do banco para busca ilike
      const getSearchName = (unit: string) => {
        if (unit === 'POA') return 'Po'; // Pega Poá
        if (unit === 'ITAQUA') return 'Itaqua'; // Pega Itaquaquecetuba
        return unit;
      };
      
      const searchName = getSearchName(selectedUnit as string);
      console.log("[FILALAB] Buscando fila inicial para a unidade:", selectedUnit, "usando termo:", searchName);
      
      const { data, error } = await supabase
        .from('unidades')
        .select('*')
        .ilike('nome_loja', `%${searchName}%`)
        .maybeSingle();

      if (error) {
         console.error("[FILALAB] Erro ao buscar unidade no Supabase:", error);
      } else if (data) {
        const unitId = data.id;
        setActiveUnitId(unitId);
        setEntregasNaFila((data as any).entregas_na_fila ?? 0);
        const pedidosBanco = (data as any).sisfood_pedidos_fila;
        setPedidosFila(Array.isArray(pedidosBanco) ? pedidosBanco : []);

        channel = supabase
          .channel(`rt_fila_${unitId}`)
          .on(
            'postgres_changes' as any,
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'unidades',
              filter: `id=eq.${unitId}`, 
            },
            (payload: any) => {
              if (payload.new) {
                if (payload.new.entregas_na_fila !== undefined) {
                   setEntregasNaFila(payload.new.entregas_na_fila);
                }
                if (payload.new.sisfood_pedidos_fila !== undefined) {
                   setPedidosFila(Array.isArray(payload.new.sisfood_pedidos_fila) ? payload.new.sisfood_pedidos_fila : []);
                }
              }
            }
          )
          .subscribe();
      }
    };
    fetchFilaInicial();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedUnit]);

  // Query para monitorar a fila em tempo real (para os alertas de atraso e exibição) - 30s
  const { data: sisfoodUnitData } = useQuery({
    queryKey: ['unidade-fila-sisfood-monitor', selectedUnit],
    queryFn: async () => {
      if (!selectedUnit) return null;
      
      const searchName = selectedUnit === 'POA' ? 'Poá' : (selectedUnit === 'ITAQUA' ? 'Itaquaquecetuba' : selectedUnit);
      
      const { data, error } = await supabase
        .from('unidades')
        .select('sisfood_pedidos_fila, entregas_na_fila')
        .ilike('nome_loja', `%${searchName}%`)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUnit,
    refetchInterval: 30000,
  });

  // Efeito para sincronizar os dados do Polling com o estado local para garantir consistência
  useEffect(() => {
    if (sisfoodUnitData) {
      const pedidos = (sisfoodUnitData as any).sisfood_pedidos_fila;
      setPedidosFila(Array.isArray(pedidos) ? pedidos : []);
      setEntregasNaFila((sisfoodUnitData as any).entregas_na_fila ?? 0);
    }
  }, [sisfoodUnitData]);

  const pedidosFilaRaw = pedidosFila; // Agora usamos o estado unificado
  
  const hasDelayedOrders = pedidosFilaRaw.some((p: any) => {
    let timestamp = parseSisfoodTime(p.hora_entrada) || 0;
    
    if (!timestamp) {
      if (p.id && String(p.id).includes('-')) {
          const parts = String(p.id).split('-');
          const ts = parseInt(parts[parts.length - 1]);
          if (!isNaN(ts)) timestamp = ts;
      } else if (p.created_at) {
          timestamp = new Date(p.created_at).getTime();
      }
    }
    
    if (!timestamp) return false;
    return (Date.now() - timestamp) / 60000 >= 20;
  });

  const filteredPedidos = pedidosFilaRaw
    .filter((p: any) => {
      const search = searchQuery.toLowerCase().trim();
      if (!search) return true;
      return (
        String(p.comanda || '').toLowerCase().includes(search) ||
        String(p.cliente || '').toLowerCase().includes(search) ||
        String(p.endereco || '').toLowerCase().includes(search)
      );
    })
    .sort((a: any, b: any) => {
      const getTime = (p: any) => {
        const ts = parseSisfoodTime(p.hora_entrada);
        if (ts) return ts;

        if (p.id && String(p.id).includes('-')) {
            const parts = String(p.id).split('-');
            const tsParts = parseInt(parts[parts.length - 1]);
            return isNaN(tsParts) ? 0 : tsParts;
        }
        return p.created_at ? new Date(p.created_at).getTime() : 0;
      };
      return getTime(a) - getTime(b);
    });
  // ====================================================


  // Configurações da franquia para checar módulos ativos
  const { data: franquiaConfig } = useQuery<{ config_pagamento: any | null }>({
    queryKey: ['franquia-config-roteirista', user?.franquiaId],
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

  const isWhatsappAtivo = (franquiaConfig?.config_pagamento?.modulos_ativos || []).includes('whatsapp');
  
  // Query para verificar se o módulo Sisfood está ativo para esta unidade específica
  const { data: unidadeModuloSisfood } = useQuery({
    queryKey: ['unidade-modulo-sisfood', user?.unidadeId],
    queryFn: async () => {
      if (!user?.unidadeId) return null;
      const { data, error } = await supabase
        .from('unidade_modulos')
        .select('ativo')
        .eq('unidade_id', user.unidadeId)
        .eq('modulo_codigo', 'sisfood_integration')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.unidadeId,
  });

  const isSisfoodAtivo = (franquiaConfig?.config_pagamento?.modulos_ativos || []).includes('sisfood_integration') && (unidadeModuloSisfood?.ativo ?? false);

  // Próximo da fila
  const nextInQueue = availableQueue[0] || null;
  const secondInQueue = availableQueue[1] || null;

  const openCallDialog = () => {
    if (!nextInQueue) {
      toast.error('Nenhum entregador na fila!');
      return;
    }
    setSelectedEntregador(nextInQueue);
    setDeliveryCount(1);
    // Default da BAG: primeira opção configurada ou fallback
    const defaultBag = bagOptions[0]?.value || 'BAG Normal';
    setTipoBag(defaultBag as TipoBag);
    setHasBebida(false);
    setSisfoodComandas('');
    setCallDialogOpen(true);
  };

  // Handler para "Não Apareceu" - move para 1ª posição
  const handleNotAppeared = async () => {
    if (!calledEntregador) return;

    try {
      // Mover para 1ª posição (timestamp mais antigo)
      const earliestTimestamp = new Date(0).toISOString();
      await updateMutation.mutateAsync({
        id: calledEntregador.id,
        data: {
          status: 'disponivel',
          fila_posicao: earliestTimestamp,
        },
      });

      toast.info(`${calledEntregador.nome} foi movido para a 1ª posição da fila`);
      setNotAppearedOpen(false);
      setCalledEntregador(null);
    } catch (error) {
      toast.error('Erro ao reposicionar motoboy');
    }
  };

  const handleConfirmCall = async () => {
    if (!selectedEntregador) return;

    setIsSending(true);

    try {
      // Marcar localmente que esta chamada tem bebida (para TV e indicadores visuais)
      if (hasBebida) {
        localStorage.setItem(`bebida_${selectedEntregador.id}`, 'true');
        setTimeout(() => localStorage.removeItem(`bebida_${selectedEntregador.id}`), 20000);
      }

      // Resolver nome da BAG a partir do ID (para franquias com tipos cadastrados)
      const bagName = franquiaBagTipos.find((b) => b.id === tipoBag)?.nome || tipoBag || '';

      // Update status to "chamado" and set tipo_bag (salvando nominalmente)
      await updateMutation.mutateAsync({
        id: selectedEntregador.id,
        data: {
          status: 'chamado',
          tipo_bag: bagName,
        },
      });

      // Disparar Notificação Push Nativa para o app mobile
      try {
        const { enviarNotificacaoChamado } = await import('@/lib/api');
        await enviarNotificacaoChamado(selectedEntregador.expo_push_token);
      } catch (e) {
        console.error("Erro ao disparar push:", e);
      }

      // Se SISFOOD ativo e o usuário digitou comandas para despachar: salvar na nuvem
      if (isSisfoodAtivo && sisfoodComandas.trim() !== '') {
        // Aceita vírgula, espaço ou quebra de linha como separador
        const comandaStrArray = sisfoodComandas.split(/[, \n]+/).map(s => s.trim()).filter(Boolean);
        if (comandaStrArray.length > 0) {
          const sisfoodPayloadPromises = comandaStrArray.map(async (comandaDigitada) => {
             // Achar o array real da fila que pareia com essa comanda
             // (Para suportar quando 'comanda' e 'id_interno' chegam separados se ajustarmos no Tampermonkey)
             let codPedidoFake = comandaDigitada;
             
             // 1. Procurar o ID Interno real do Sisfood associado a esta comanda/cod_pedido_interno visual
              let sisfoodInternalId = String(codPedidoFake);
              // Procurar na master list de pedidos em fila retornado pela Unidade (banco de dados)
              const realPedido = pedidosFila.find(p => (String(p.comanda) === String(codPedidoFake)) || (String(p.id) === String(codPedidoFake)));
              if (realPedido && realPedido.id_interno) {
                  sisfoodInternalId = String(realPedido.id_interno);
              }

              return supabase.from('sisfood_comandos' as any).insert({
                  unidade_nome: selectedUnit,
                  unidade_id: activeUnitId || user?.unidadeId,
                  cod_pedido_interno: sisfoodInternalId, // AQUI envia o ID longo para o despacho funcionar!
                  nome_motoboy: selectedEntregador.nome, 
                  status: 'PENDENTE'
              });
          });
          
          await Promise.all(sisfoodPayloadPromises);
        }
      }

      // Cria a Saída no ato da chamada para aparecer na TV imediatamente
      if (!isTrainingMode) {
        await createHistoricoEntrega({
          entregador_id: selectedEntregador.id,
          unidade: selectedUnit,
          unidade_id: user?.unidadeId,
          tipo_bag: bagName,
        });
        queryClient.invalidateQueries({ queryKey: ['saidas-dia', selectedUnit] });

        // Disparar webhook de despacho (server-side)
        await sendDispatchWebhook({
          unidade: selectedUnit,
          unidadeId: user?.unidadeId,
          entregador: selectedEntregador,
          quantidadeEntregas: deliveryCount,
          bag: bagName,
          hasBebida: hasBebida,
        });

        // Send WhatsApp message with delivery count and bag type
        const bagMessage = bagName
          ? `🎒 Pegue a ${bagName.toUpperCase()}`
          : '🎒 Pegue a sua BAG';

        const bebidaMessage = hasBebida
          ? '\n\n*⚠️ ATENÇÃO, NO SEUS PEDIDOS POSSUI BEBIDA*'
          : '';

        const message = deliveryCount === 1
          ? `🍕 Sua vez na unidade ${selectedUnit}! Você tem 1 entrega. ${bagMessage}. Vá ao balcão.${bebidaMessage}`
          : `🍕 Sua vez na unidade ${selectedUnit}! Você tem ${deliveryCount} entregas. ${bagMessage}. Vá ao balcão.${bebidaMessage}`;

        if (isWhatsappAtivo && selectedEntregador.whatsapp_ativo !== false) {
          await sendWhatsAppMessage(selectedEntregador.telefone, message, {
            franquiaId: user?.franquiaId ?? null,
            unidadeId: null,
          });
        }
      } else {
        // Simulando fluxo na memória
        setFakeHistorico([...fakeHistorico, { id: Date.now().toString(), entregador_id: selectedEntregador.id }]);
      }

      toast.success(`${selectedEntregador.nome} foi chamado com ${deliveryCount} entrega(s)!`);
      setCallDialogOpen(false);

      // Mostrar modal "Não Apareceu" por 5 segundos
      setCalledEntregador(selectedEntregador);
      setNotAppearedOpen(true);

      // Enviar mensagem para o segundo da fila após 5 segundos
      if (secondInQueue && isWhatsappAtivo && secondInQueue.whatsapp_ativo !== false) {
        setTimeout(async () => {
          try {
            const alertMessage = `⚠️ Atenção ${secondInQueue.nome}! Você é o próximo da fila na unidade ${selectedUnit}. Fique alerta!`;
            await sendWhatsAppMessage(secondInQueue.telefone, alertMessage, {
              franquiaId: user?.franquiaId ?? null,
              unidadeId: null,
            });
            toast.info(`Alerta enviado para ${secondInQueue.nome}`);
          } catch (error) {
            console.error('Erro ao enviar alerta para segundo da fila:', error);
          }
        }, 5000);
      }
    } catch (error) {
      toast.error('Erro ao chamar entregador');
    } finally {
      setIsSending(false);
    }
  };

  // NOVAS AÇÕES PARA ROTEIRIZAÇÃO

  // 1. Mover para "Em Entrega" (apenas muda status, sem mensagem)
  const handleMoveToDelivering = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: {
          status: 'entregando',
          hora_saida: new Date().toISOString(),
        },
      });

      if (!isTrainingMode) {
        // Se a loja clicar em 'Em Entrega', atualiza o início do tempo contábil no Analytics
        await atualizarSaidaEntrega(entregador.id, selectedUnit);
        queryClient.invalidateQueries({ queryKey: ['saidas-dia', selectedUnit] });
      }

      toast.success(`${entregador.nome} movido para Em Entrega`);
    } catch (error) {
      toast.error('Erro ao mover entregador');
    }
  };

  // 2. Chamar Motoboy (com motivo obrigatório + WhatsApp, não remove da fila)
  const handleCallMotoboy = async (motivo: string) => {
    if (!actionEntregador) return;

    setIsSending(true);
    try {
      const message = `🔔 *CHAMADA ESPECIAL*\n\nOlá ${actionEntregador.nome}!\n\nMotivo: ${motivo}\n\nPor favor, compareça ao balcão da unidade ${selectedUnit}.`;

      if (isWhatsappAtivo && actionEntregador.whatsapp_ativo !== false) {
        await sendWhatsAppMessage(actionEntregador.telefone, message, {
          franquiaId: user?.franquiaId ?? null,
          unidadeId: null,
        });
        toast.success(`Mensagem enviada para ${actionEntregador.nome}`);
      } else {
        toast.success(`Motoboy chamado visualmente (WhatsApp dele ou da franquia desativado)`);
      }

      setCallMotoboyOpen(false);
      setActionEntregador(null);
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  // 3. Voltar para fila (de "Em Entrega" para "Disponível")
  const handleReturnToQueue = async () => {
    if (!actionEntregador) return;

    setIsSending(true);
    try {
      await updateMutation.mutateAsync({
        id: actionEntregador.id,
        data: {
          status: 'disponivel',
          hora_saida: null,
          fila_posicao: new Date().toISOString(),
        },
      });

      // Finaliza a entrega batendo a hora de retorno (fecha o timer do Analytics Pro)
      await registrarRetornoEntrega(actionEntregador.id, selectedUnit);
      queryClient.invalidateQueries({ queryKey: ['saidas-dia', selectedUnit] });

      toast.success(`${actionEntregador.nome} retornou para a fila`);
      setReturnToQueueOpen(false);
      setActionEntregador(null);
    } catch (error) {
      toast.error('Erro ao retornar entregador para fila');
    } finally {
      setIsSending(false);
    }
  };

  // 3.1 Remover da fila de Em Entrega (cancelar sem registrar historico)
  const handleCancelDelivery = async (entregadorId: string, nome: string) => {
    try {
      await updateMutation.mutateAsync({
        id: entregadorId,
        data: {
          status: 'disponivel',
          hora_saida: null,
          fila_posicao: new Date().toISOString(),
        },
      });
      toast.success(`${nome} foi removido da entrega e voltou para a fila.`);
    } catch (error) {
      toast.error('Erro ao remover da fila de entrega');
    }
  };

  // Pular a vez do motoboy
  const handleSkipTurn = async () => {
    if (!selectedEntregador || !skipReason.trim()) {
      toast.error('Informe o motivo para pular a vez');
      return;
    }

    try {
      let newTimestamp = new Date().toISOString();

      if (skipPosition === 'proximo') {
        const others = availableQueue.filter(m => m.id !== selectedEntregador.id);
        if (others.length > 0) {
          const m1 = others[0];
          const t1 = new Date(m1.fila_posicao || 0).getTime();

          if (others.length > 1) {
            const m2 = others[1];
            const t2 = new Date(m2.fila_posicao || 0).getTime();
            newTimestamp = new Date(t1 + (t2 - t1) / 2).toISOString();
          } else {
            newTimestamp = new Date(t1 + 1000).toISOString();
          }
        }
      }

      await updateMutation.mutateAsync({
        id: selectedEntregador.id,
        data: {
          fila_posicao: newTimestamp,
        },
      });

      toast.success(`${selectedEntregador.nome} movido para ${skipPosition === 'proximo' ? 'o próximo' : 'o final'} da fila.`);
      setSkipDialogOpen(false);
      setSkipReason('');
      setSkipPosition('proximo');
      setSelectedEntregador(null);
    } catch (error) {
      toast.error('Erro ao pular a vez');
    }
  };

  // Remover da fila (desativa temporariamente)
  const handleRemoveFromQueue = async (entregador: Entregador) => {
    try {
      await updateMutation.mutateAsync({
        id: entregador.id,
        data: {
          ativo: false,
        },
      });

      toast.success(`${entregador.nome} foi removido da fila`);
    } catch (error) {
      toast.error('Erro ao remover da fila');
    }
  };

  // Handle drag and drop reorder
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    // Reorder the local array
    const reordered = [...availableQueue];
    const [removed] = reordered.splice(sourceIndex, 1);
    reordered.splice(destIndex, 0, removed);

    // Update fila_posicao for all affected entregadores using bulk update
    const now = new Date();
    const batchUpdates = reordered.map((entregador, index) => ({
      id: entregador.id,
      data: { fila_posicao: new Date(now.getTime() + index * 1000).toISOString() }
    }));

    try {
      // Importante: Usar o queryClient para atualizar o cache local IMEDIATAMENTE (optimistic update)
      queryClient.setQueryData(['entregadores', selectedUnit, 'active'], (old: any) => {
        if (!old) return old;
        const updated = [...old];
        batchUpdates.forEach(update => {
          const idx = updated.findIndex(e => e.id === update.id);
          if (idx !== -1) updated[idx] = { ...updated[idx], ...update.data };
        });
        return updated.sort((a, b) => new Date(a.fila_posicao).getTime() - new Date(b.fila_posicao).getTime());
      });

      const { bulkUpdateEntregadores } = await import('@/lib/api');
      await bulkUpdateEntregadores(batchUpdates);
      toast.success('Ordem da fila atualizada!');
    } catch (error) {
      console.error('Erro ao reordenar fila:', error);
      toast.error('Erro ao reordenar fila');
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
    }
  };

  const handleCallClick = (entregador: Entregador) => {
    setSelectedEntregador(entregador);
    setDeliveryCount(1);
    const defaultBag = bagOptions[0]?.value || 'BAG Normal';
    setTipoBag(defaultBag as TipoBag);
    setHasBebida(false);
    setSisfoodComandas('');
    setCallDialogOpen(true);
  };

  const handleSkipClick = (entregador: Entregador) => {
    setSelectedEntregador(entregador);
    setSkipReason('');
    setSkipDialogOpen(true);
  };

  const handleRemoveClick = (entregador: Entregador) => {
    handleRemoveFromQueue(entregador);
  };

  const handleWhatsAppClickLocal = (entregador: Entregador) => {
    // Definir actionEntregador e abrir o modal de chamada que tem o input de motivo
    setActionEntregador(entregador);
    setCallMotoboyOpen(true);
  };

  return (
    <Layout>
      <BackButton />

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono mb-2">Roteirista</h1>
          <p className="text-muted-foreground">
            Controle da fila de entregas •{' '}
            <span className="font-semibold text-foreground">{selectedUnit}</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-semibold tracking-wide text-muted-foreground">
              ENTREGAS NA FILA : <span className="font-mono text-foreground">{entregasNaFila !== null ? entregasNaFila : '...'}</span>
            </span>
            {entregasNaFila !== null && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" title="Ao vivo (Sisfood)"></span>
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-3">
          {isSisfoodAtivo && (
            <div className="relative">
              <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={`w-full sm:w-auto gap-2 transition-all min-h-[48px] sm:min-h-0 ${
                      hasDelayedOrders ? 'border-destructive text-destructive hover:bg-destructive/10 bg-destructive/5' : 'border-blue-500/50 hover:bg-blue-500/10 text-blue-500'
                    }`}
                  >
                    <ListFilter className="w-5 h-5" />
                    Acompanhar Fila
                    {hasDelayedOrders && (
                      <>
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full animate-bounce shadow-lg whitespace-nowrap">
                          PEDIDOS ATRASADOS
                        </div>
                        <AlertTriangle className="w-4 h-4 ml-1 animate-pulse" />
                      </>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border-border/50 shadow-2xl">
                  <DialogHeader className="p-6 pb-2 border-b border-border/10 bg-muted/20">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                      <ListFilter className="w-5 h-5 text-primary" />
                      Fila Sisfood - {selectedUnit}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="p-6 pt-4 space-y-4 flex-1 flex flex-col min-h-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Comanda, cliente ou endereço..." 
                        className="pl-9 bg-muted/30 border-border/30"
                        value={searchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                      <div className="space-y-3 pb-4">
                        {filteredPedidos.length === 0 ? (
                          <div className="text-center py-10 text-muted-foreground">
                            <p>Nenhum pedido encontrado na fila.</p>
                          </div>
                        ) : (
                          filteredPedidos.map((p: any, idx: number) => {
                            const timestamp = parseSisfoodTime(p.hora_entrada) || (p.created_at ? new Date(p.created_at).getTime() : Date.now());
                            const diffMin = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
                            const isDelayed = diffMin >= 20;

                            return (
                              <div key={idx} className={`p-4 rounded-xl border border-border/50 bg-card/50 flex flex-col gap-2 transition-all hover:border-primary/30 ${isDelayed ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold py-0 h-5">
                                      #{p.comanda || p.id}
                                    </Badge>
                                    <div className="flex flex-col items-start gap-1">
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="secondary" className={`text-[10px] uppercase font-bold py-0 h-5 border-none ${isDelayed ? 'bg-destructive/20 text-destructive' : 'bg-blue-500/10 text-blue-400'}`}>
                                          <Clock className="w-3 h-3 mr-1" />
                                          {diffMin}m
                                        </Badge>
                                        {p.hora_entrada && (
                                          <span className="text-[10px] font-bold text-muted-foreground/60 font-mono">
                                            {p.hora_entrada.includes(' ') ? p.hora_entrada.split(' ')[1] : p.hora_entrada}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-muted-foreground font-mono opacity-50">#{p.id_interno || p.id}</span>
                                </div>
                                
                                <div className="space-y-1">
                                  <h4 className="font-bold text-sm flex items-center gap-2">
                                    {p.cliente}
                                    {p.telefone && <span className="text-xs font-normal text-muted-foreground">/ {p.telefone}</span>}
                                  </h4>
                                  {p.endereco && (
                                    <p className="text-[11px] text-muted-foreground flex items-start gap-1">
                                      <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                      {p.endereco}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {!isTrainingMode && (
            <Button
              variant="outline"
              className="w-full sm:w-auto gap-2 border-blue-500/50 hover:bg-blue-500/10 transition-colors text-blue-500 min-h-[48px] sm:min-h-0"
              onClick={() => startTraining()}
              title="Iniciar treinamento guiado"
            >
              <GraduationCap className="w-5 h-5" />
              Tutorial
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full sm:w-auto gap-2 border-primary/50 hover:bg-primary/10 transition-colors min-h-[48px] sm:min-h-0"
            onClick={() => setMapModalOpen(true)}
          >
            <Map className="w-5 h-5 text-primary" />
            Mapa
          </Button>
        </div>
      </div>

      {isTrainingMode && currentStep !== 'none' && currentStep !== 'finished' && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-[2px] z-[100] transition-all duration-300 pointer-events-auto mix-blend-multiply dark:mix-blend-normal" />
      )}

      {/* Botão Grande CHAMAR O PRÓXIMO */}
      <div className={`mb-4 ${isTrainingMode && currentStep === 'chamar_entrega' ? 'relative z-[101] animate-pulse ring-4 ring-primary rounded-lg ring-offset-4 ring-offset-background' : ''}`}>
        <Button
          onClick={openCallDialog}
          disabled={!nextInQueue || isLoading}
          className="w-full h-24 text-2xl font-bold font-mono bg-accent hover:bg-accent/90 text-accent-foreground gap-4"
        >
          <Phone className="w-8 h-8" />
          {nextInQueue ? (
            <>CHAMAR: {nextInQueue.nome.toUpperCase()}</>
          ) : (
            <>NENHUM NA FILA</>
          )}
        </Button>
      </div>

      {/* Stats Row + TV preview (ao vivo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-available" />
            <span className="text-sm text-muted-foreground">Na fila</span>
          </div>
          <p className="text-3xl font-bold font-mono">{availableQueue.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-called animate-pulse" />
            <span className="text-sm text-muted-foreground">Chamados</span>
          </div>
          <p className="text-3xl font-bold font-mono">{calledQueue.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-status-delivering" />
            <span className="text-sm text-muted-foreground">Entregando</span>
          </div>
          <p className="text-3xl font-bold font-mono">{deliveringQueue.length}</p>
        </div>
        <TvPaymentPreview
          franquiaId={user?.franquiaId ?? null}
          unidadeNome={selectedUnit as any}
          unidadeId={user?.unidadeId ?? null}
          unidadeSlug={selectedUnit as any}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Available Queue with Drag and Drop */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Fila de Disponíveis ({availableQueue.length})
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (arraste para reordenar)
              </span>
            </h2>
            {availableQueue.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum entregador disponível</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="queue">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-3"
                    >
                      {availableQueue
                        .filter((e) => e.nome.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((entregador, index) => (
                          <QueueCard
                            key={entregador.id}
                            entregador={entregador}
                            index={index}
                            onCall={handleCallClick}
                            onSkip={handleSkipClick}
                            onRemove={handleRemoveClick}
                            onWhatsApp={handleWhatsAppClickLocal}
                            onMap={(e) => {
                              setSelectedEntregador(e);
                              setMapModalOpen(true);
                            }}
                            isFirst={index === 0 && searchQuery === ''}
                          />
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>

          {/* Delivering Queue */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Em Entrega ({deliveringQueue.length})
            </h2>
            {deliveringQueue.length === 0 ? (
              <div className="text-center py-12 bg-card border border-dashed border-border rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum entregador em entrega no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveringQueue.map((entregador, index) => (
                  <div
                    key={entregador.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 bg-card border border-border rounded-xl p-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xl font-bold font-mono text-orange-600">
                      {entregador.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold truncate">
                          {entregador.nome}
                        </p>
                        {/* Indicador se o Whatsapp individual dele tá off/on */}
                        {isWhatsappAtivo && (
                          entregador.whatsapp_ativo === false ? (
                            <div title="Mensagens desativadas"><MessageCircleOff className="w-4 h-4 text-destructive shrink-0" /></div>
                          ) : (
                            <div title="Mensagens ativadas"><MessageCircle className="w-4 h-4 text-green-500 shrink-0" /></div>
                          )
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground break-all">{entregador.telefone}</p>
                      {/* Indicador visual de bebida, baseado na flag temporária armazenada no localStorage */}
                      {typeof window !== 'undefined' &&
                        localStorage.getItem(`bebida_${entregador.id}`) === 'true' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/20 text-xs font-semibold text-yellow-300 border border-yellow-400/60">
                            <span className="text-base leading-none">🍹</span>
                            Tem bebida neste pedido
                          </span>
                        )}
                    </div>
                    <DeliveryTimer startTime={entregador.hora_saida} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-border">
                      <div className="hidden sm:block w-3 h-3 rounded-full bg-status-delivering" />

                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button
                          variant="destructive"
                          size="sm"
                          className={`w-full sm:w-auto gap-2 min-h-[48px] sm:min-h-0 order-last sm:order-none ${isTrainingMode && currentStep === 'remover_fila' && index === 0 ? 'relative z-[101] ring-2 ring-destructive ring-offset-2 ring-offset-background animate-pulse' : ''}`}
                          onClick={() => handleCancelDelivery(entregador.id, entregador.nome)}
                        >
                          <XCircle className="w-4 h-4" />
                          Remover da Fila
                        </Button>

                        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto gap-2 min-h-[48px] sm:min-h-0"
                            onClick={() => {
                              setActionEntregador(entregador);
                              setReturnToQueueOpen(true);
                            }}
                          >
                            <ArrowRight className="w-4 h-4" />
                            Finalizar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto gap-2 min-h-[48px] sm:min-h-0"
                            onClick={() => {
                              setActionEntregador(entregador);
                              setCallMotoboyOpen(true);
                            }}
                          >
                            <MessageSquare className="w-4 h-4" />
                            Chamar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Call Dialog */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-2xl">Chamar Entregador</DialogTitle>
          </DialogHeader>

          {selectedEntregador && (
            <div className="space-y-4 py-4">
              <div className="bg-accent/20 border-2 border-accent rounded-lg p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Próximo da fila</p>
                <p className="text-3xl font-bold font-mono text-accent">{selectedEntregador.nome}</p>
                <p className="text-sm text-muted-foreground mt-1">{selectedEntregador.telefone}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-lg">Quantas entregas?</Label>
                {isSisfoodAtivo ? (
                  <div className="space-y-2">
                    <Textarea 
                       placeholder="Ex: 54, 55 ou&#10;54&#10;55"
                       className="text-lg font-mono p-4"
                       value={sisfoodComandas}
                       onChange={(e) => {
                         setSisfoodComandas(e.target.value);
                         const qs = e.target.value.split(/[, \n]+/).filter(x => x.trim().length > 0).length;
                         if (qs > 0) setDeliveryCount(qs);
                       }}
                    />
                    <p className="text-sm text-muted-foreground">A quantidade se ajustará sozinha: {deliveryCount} entrega{deliveryCount !== 1 ? 's' : ''}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        variant={deliveryCount === num ? 'default' : 'outline'}
                        className="h-16 text-2xl font-mono"
                        onClick={() => setDeliveryCount(num)}
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-lg">Tipo de BAG</Label>
                {isLoadingBags && user?.franquiaId ? (
                  <div className="text-sm text-muted-foreground">Carregando tipos de BAG...</div>
                ) : (
                  <RadioGroup
                    value={tipoBag}
                    onValueChange={(value) => setTipoBag(value as TipoBag)}
                    className="grid grid-cols-2 gap-4"
                  >
                    {bagOptions.map((bag) => (
                      <div key={bag.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={bag.id} id={`bag-${bag.id}`} />
                        <Label
                          htmlFor={`bag-${bag.id}`}
                          className="flex-1 cursor-pointer p-4 border-2 rounded-lg hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10"
                        >
                          <div className="text-center">
                            {bag.icone_url ? (
                               <img src={bag.icone_url} alt={bag.label} className="w-10 h-10 mx-auto object-cover rounded-md" />
                            ) : (
                               <span className="text-2xl">🎒</span>
                            )}
                            <p className="font-semibold mt-1">{bag.label}</p>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>

              {/* Opção de Bebida */}
              <div className="space-y-3">
                <Label className="text-lg">Tem bebida no pedido?</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setHasBebida(false)}
                    className={`p-4 border-2 rounded-lg transition-colors ${!hasBebida
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                      }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl">❌</span>
                      <p className="font-semibold mt-1">Não</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasBebida(true)}
                    className={`p-4 border-2 rounded-lg transition-colors ${hasBebida
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-border hover:border-orange-500/50'
                      }`}
                  >
                    <div className="text-center">
                      <span className="text-2xl">🥤</span>
                      <p className="font-semibold mt-1">Sim, tem bebida</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => setCallDialogOpen(false)}
              disabled={isSending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCall}
              disabled={isSending}
              className="flex-1 bg-accent hover:bg-accent/90 text-lg h-12"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              CHAMAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Dialog */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-xl">Pular a Vez</DialogTitle>
          </DialogHeader>

          {selectedEntregador && (
            <div className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Motoboy</p>
                  <p className="text-lg font-bold font-mono">{selectedEntregador.nome}</p>
                </div>

                <div className="space-y-3">
                  <Label>Qual posição ele deve assumir?</Label>
                  <RadioGroup
                    value={skipPosition}
                    onValueChange={(val: 'ultimo' | 'proximo') => setSkipPosition(val)}
                    className="flex flex-col space-y-2"
                  >
                    <div className="flex items-start space-x-3 border rounded-md p-3 bg-card hover:bg-accent/50 cursor-pointer" onClick={() => setSkipPosition('proximo')}>
                      <RadioGroupItem value="proximo" id="r-proximo" className="mt-1" />
                      <Label htmlFor="r-proximo" className="font-medium cursor-pointer leading-tight">
                        Colocar como Próximo
                        <p className="text-xs text-muted-foreground font-normal mt-1">Ele será o próximo a ser chamado logo após o atual.</p>
                      </Label>
                    </div>
                    <div className="flex items-start space-x-3 border rounded-md p-3 bg-card hover:bg-accent/50 cursor-pointer" onClick={() => setSkipPosition('ultimo')}>
                      <RadioGroupItem value="ultimo" id="r-ultimo" className="mt-1" />
                      <Label htmlFor="r-ultimo" className="font-medium cursor-pointer leading-tight">
                        Colocar como Último
                        <p className="text-xs text-muted-foreground font-normal mt-1">Ele voltará a ser o último da fila.</p>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skipReason">Motivo para pular a vez</Label>
                  <Textarea
                    id="skipReason"
                    value={skipReason}
                    onChange={(e) => setSkipReason(e.target.value)}
                    placeholder="Ex: Pneu furado, documentação, foi ao banheiro..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setSkipDialogOpen(false);
                setSkipReason('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSkipTurn}
              disabled={!skipReason.trim()}
              className="flex-1"
            >
              Pular Vez
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotAppearedModal
        open={notAppearedOpen}
        entregador={calledEntregador}
        selectedUnit={selectedUnit as string}
        onClose={() => {
          setNotAppearedOpen(false);
          setCalledEntregador(null);
        }}
        onNotAppeared={handleNotAppeared}
      />

      {/* Novos Modais */}
      <CallMotoboyModal
        open={callMotoboyOpen}
        onOpenChange={setCallMotoboyOpen}
        entregador={actionEntregador}
        onConfirm={handleCallMotoboy}
        isLoading={isSending}
      />

      <ReturnToQueueModal
        open={returnToQueueOpen}
        onOpenChange={setReturnToQueueOpen}
        entregador={actionEntregador}
        onConfirm={handleReturnToQueue}
        isLoading={isSending}
      />

      {/* Modal de Mapa */}
      <MotoboyMapModal
        open={mapModalOpen}
        onOpenChange={setMapModalOpen}
        entregadores={entregadores}
        storeLat={(systemConfig as any)?.latitude ? parseFloat((systemConfig as any).latitude) : null}
        storeLng={(systemConfig as any)?.longitude ? parseFloat((systemConfig as any).longitude) : null}
        storeCity={(systemConfig as any)?.cidade}
        storeState={(systemConfig as any)?.estado}
        pedidosFila={pedidosFila}
      />
    </Layout>
  );
}
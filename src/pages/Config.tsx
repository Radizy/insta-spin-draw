import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout, BackButton } from '@/components/Layout';
import { EntregadorCard } from '@/components/EntregadorCard';
import { UsersManagement } from '@/components/UsersManagement';
import { WebhookConfig } from '@/components/WebhookConfig';
import { WhatsAppTemplates } from '@/components/WhatsAppTemplates';
import { BulkMotoboyImport } from '@/components/BulkMotoboyImport';
import { TVCallConfigModal } from '@/components/TVCallConfigModal';
import { MediaGalleryModal } from '@/components/MediaGalleryModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModulosConfig } from '@/components/ModulosConfig';
import { DadosDaLoja } from '@/components/DadosDaLoja';
import { FranquiaPlanoManager } from '@/components/FranquiaPlanoManager';
import { FranquiaFinanceiroPanel } from '@/components/FranquiaFinanceiroPanel';
import { EtiquetasConfigPanel } from '@/components/etiquetas/EtiquetasConfigPanel';
import { isModuloAtivo } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MaquininhaManagement } from '@/components/MaquininhaManagement';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  fetchEntregadores,
  createEntregador,
  updateEntregador,
  deleteEntregador,
  resetDaily,
  Entregador,
  Unidade,
  DiasTrabalho,
  TURNO_PADRAO,
} from '@/lib/api';
import { Trash2, AlertCircle, Volume2, Plus, Clock, Save, Edit, RefreshCw, LogOut, Download, Mic, Upload, Users, Loader2, Filter, RotateCcw, Smartphone, Settings2, Globe, CreditCard, Store, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useTraining } from '@/contexts/TrainingContext';

const DIAS_SEMANA = [
  { key: 'seg', label: 'Segunda' },
  { key: 'ter', label: 'Terça' },
  { key: 'qua', label: 'Quarta' },
  { key: 'qui', label: 'Quinta' },
  { key: 'sex', label: 'Sexta' },
  { key: 'sab', label: 'Sábado' },
  { key: 'dom', label: 'Domingo' },
] as const;

const DEFAULT_DIAS_TRABALHO: DiasTrabalho = {
  dom: true,
  seg: true,
  ter: true,
  qua: true,
  qui: true,
  sex: true,
  sab: true,
};

export default function Config() {
  const { selectedUnit } = useUnit();
  const { logout, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isTrainingMode, fakeEntregadores, setFakeEntregadores, setFakeHistorico } = useTraining();
  const cancelVoicesRef = useRef(false);

  const [searchParams] = useSearchParams();
  const isPaymentBlocked = searchParams.get('bloqueio') === '1';
  const isFranquiaAdmin = user?.role === 'admin_franquia';
  const tabParam = searchParams.get('tab');
  const initialTab = isPaymentBlocked && isFranquiaAdmin ? 'financeiro' : (tabParam || 'motoboys');
  const [paymentBlockedOpen, setPaymentBlockedOpen] = useState(isPaymentBlocked && isFranquiaAdmin);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntregador, setEditingEntregador] = useState<Entregador | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isGeneratingAllVoices, setIsGeneratingAllVoices] = useState(false);
  const [voicesProgress, setVoicesProgress] = useState<{ current: number; total: number } | null>(null);
  const [showAudioPreview, setShowAudioPreview] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [tvCallConfigOpen, setTvCallConfigOpen] = useState(false);
  const [tvCallModuleActive, setTvCallModuleActive] = useState(false);
  const [galleryOpenForEntregador, setGalleryOpenForEntregador] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    unidade: selectedUnit || ('ITAQUA' as Unidade),
    dias_trabalho: DEFAULT_DIAS_TRABALHO,
    usar_turno_padrao: true,
    turno_inicio: TURNO_PADRAO.inicio.slice(0, 5),
    turno_fim: TURNO_PADRAO.fim.slice(0, 5),
  });

  // Query para resolver o ID da unidade a partir do slug selecionado (essencial para admin_franquia)
  const { data: currentUnitData, isLoading: isLoadingUnitId } = useQuery({
    queryKey: ['unidade-detalhes', selectedUnit],
    queryFn: async () => {
      if (!selectedUnit) return null;

      const { data, error } = await supabase
        .from('unidades')
        .select('id, nome_loja')
        .eq('slug', selectedUnit)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUnit,
  });

  const resolvedUnidadeId = currentUnitData?.id;

  // Filtros
  const [filterStatus, setFilterStatus] = useState<'all' | 'ativo' | 'inativo'>('all');
  const [filterTurno, setFilterTurno] = useState<'all' | 'padrao' | 'custom'>('all');

  // Redirect se não houver unidade selecionada, exceto quando o acesso estiver bloqueado
  // e o admin de franquia precisa entrar apenas no Financeiro
  if (!selectedUnit && !(isPaymentBlocked && isFranquiaAdmin)) {
    return <Navigate to="/" replace />;
  }

  // Query for fetching entregadores
  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ['entregadores', selectedUnit, resolvedUnidadeId],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit, unidade_id: resolvedUnidadeId || user?.unidadeId }),
  });

  // Configuração da franquia (para reaproveitar tv_tts / ElevenLabs)
  const { data: franquiaConfig } = useQuery<any>({
    queryKey: ['franquia-config', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return { config_pagamento: null };
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      const config = data?.config_pagamento || {};
      return {
        config_pagamento: config,
        ...config
      };
    },
    enabled: !!user?.franquiaId,
  });

  // Check if tv_avancada module is active
  useEffect(() => {
    const targetUnitId = resolvedUnidadeId || user?.unidadeId;
    if (!targetUnitId) return;
    isModuloAtivo(targetUnitId, 'tv_avancada').then(setTvCallModuleActive);
  }, [resolvedUnidadeId, user?.unidadeId]);

  const isModuloAtivoLocal = (modulo: string) => {
    return (franquiaConfig?.config_pagamento?.modulos_ativos || []).includes(modulo);
  };

  // Buscar bags da franquia
  const { data: franquiaBagTipos = [] } = useQuery<{
    id: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    franquia_id: string;
    audio_url?: string | null;
    icone_url?: string | null;
  }[]>({
    queryKey: ['franquia-bag-tipos', user?.franquiaId],
    staleTime: 1000 * 60 * 60,
    queryFn: async () => {
      if (!user?.franquiaId) return [];
      const { data, error } = await supabase
        .from('franquia_bag_tipos')
        .select('id, nome, descricao, ativo, franquia_id, audio_url, icone_url')
        .eq('franquia_id', user.franquiaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.franquiaId,
  });

  // Query para verificar áudios de bags/bebida gerados
  const { data: generatedAudios = { bags: [], bebida: null }, refetch: refetchAudios } = useQuery({
    queryKey: ['generated-audios', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return { bags: [], bebida: null };

      const { data: files } = await supabase.storage
        .from('motoboy_voices')
        .list(`${user.franquiaId}/bags`);

      const { data: rootFiles } = await supabase.storage
        .from('motoboy_voices')
        .list(user.franquiaId);

      const { data: bagRows } = await supabase
        .from('franquia_bag_tipos')
        .select('id, nome, audio_url')
        .eq('franquia_id', user.franquiaId);

      const bebidaFile = rootFiles?.find(
        (f) => f.name === 'bebida.mp3' || f.name === 'bebida.wav',
      );

      const storageBagFiles = (files || []).filter((f) => f.name !== '.emptyFolderPlaceholder');

      const allBagAudios: Array<{
        name: string;
        bagId?: string;
        bagNome?: string;
        url?: string;
        storagePath?: string;
        source: 'storage' | 'url';
      }> = [];

      storageBagFiles.forEach((f) => {
        const bagIdFromFilename = f.name.replace(/\.(mp3|wav|ogg|m4a)$/i, '');
        const matchedBag = bagRows?.find((b) => b.id === bagIdFromFilename);
        allBagAudios.push({
          name: f.name,
          bagId: matchedBag?.id || bagIdFromFilename,
          bagNome: matchedBag?.nome,
          storagePath: `${user.franquiaId}/bags/${f.name}`,
          source: 'storage',
        });
      });

      // Adiciona bags que têm audio_url direto na tabela se já não estiverem mapeadas
      (bagRows || []).forEach((b) => {
        if (b.audio_url) {
          const alreadyInList = allBagAudios.some((item) => item.bagId === b.id);
          if (!alreadyInList) {
            const fileName = b.audio_url.split('/').pop()?.split('?')[0] || `${b.nome}.audio`;
            allBagAudios.push({
              name: fileName,
              bagId: b.id,
              bagNome: b.nome,
              url: b.audio_url,
              source: 'url',
            });
          }
        }
      });

      return {
        bags: allBagAudios,
        bebida: bebidaFile ? bebidaFile.name : null,
      };
    },
    enabled: !!user?.franquiaId,
  });

  // Filtrar entregadores
  const filteredEntregadores = entregadores.filter((e) => {
    if (filterStatus === 'ativo' && !e.ativo) return false;
    if (filterStatus === 'inativo' && e.ativo) return false;
    if (filterTurno === 'padrao' && e.usar_turno_padrao === false) return false;
    if (filterTurno === 'custom' && e.usar_turno_padrao !== false) return false;
    return true;
  });

  // Mutation for creating entregador
  const createMutation = useMutation({
    mutationFn: createEntregador,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador cadastrado com sucesso!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao cadastrar entregador');
    },
  });

  // Mutation for updating entregador
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Entregador> }) =>
      updateEntregador(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador atualizado!');
      resetForm();
    },
    onError: () => {
      toast.error('Erro ao atualizar entregador');
    },
  });

  // Mutation for deleting entregador
  const deleteMutation = useMutation({
    mutationFn: deleteEntregador,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      toast.success('Entregador removido!');
    },
    onError: () => {
      toast.error('Erro ao remover entregador');
    },
  });

  const resetDailyMutation = useMutation({
    mutationFn: async () => {
      if (isTrainingMode) {
        setFakeEntregadores(
          fakeEntregadores.map((e) => ({ ...e, status: 'disponivel', hora_saida: null }))
        );
        setFakeHistorico([]);
        return;
      }
      return resetDaily(selectedUnit);
    },
    onSuccess: () => {
      if (!isTrainingMode) {
        queryClient.invalidateQueries({ queryKey: ['entregadores'] });
        queryClient.invalidateQueries({ queryKey: ['saidas-dia'] });
        queryClient.invalidateQueries({ queryKey: ['registros-ponto-dia'] });
        queryClient.invalidateQueries({ queryKey: ['planilha-ponto'] });
        queryClient.invalidateQueries({ queryKey: ['funcionarios-internos'] });
      }
      setResetDialogOpen(false);
      toast.success('Reset de expediente concluído: motoboys e equipe interna foram resetados para o próximo turno.');
    },
    onError: () => {
      toast.error('Erro ao executar reset diário. Tente novamente.');
    },
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      telefone: '',
      unidade: selectedUnit,
      dias_trabalho: DEFAULT_DIAS_TRABALHO,
      usar_turno_padrao: true,
      turno_inicio: TURNO_PADRAO.inicio.slice(0, 5),
      turno_fim: TURNO_PADRAO.fim.slice(0, 5),
    });
    setEditingEntregador(null);
    setIsFormOpen(false);
    setIsGeneratingVoice(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error('Preencha o nome do motoboy');
      return;
    }

    const turnoInicio = formData.turno_inicio + ':00';
    const turnoFim = formData.turno_fim + ':00';

    if (editingEntregador) {
      updateMutation.mutate({
        id: editingEntregador.id,
        data: {
          nome: formData.nome,
          telefone: formData.telefone.trim() || 'S/N',
          dias_trabalho: formData.dias_trabalho,
          usar_turno_padrao: formData.usar_turno_padrao,
          turno_inicio: turnoInicio,
          turno_fim: turnoFim,
        },
      });
    } else {
      createMutation.mutate({
        nome: formData.nome,
        telefone: formData.telefone.trim() || 'S/N',
        unidade: formData.unidade,
        unidade_id: resolvedUnidadeId || user?.unidadeId || null,
        status: 'disponivel',
        ativo: true,
        dias_trabalho: formData.dias_trabalho,
        usar_turno_padrao: formData.usar_turno_padrao,
        turno_inicio: turnoInicio,
        turno_fim: turnoFim,
        whatsapp_ativo: false,
      });
    }
  };

  const handleEdit = (entregador: Entregador) => {
    setEditingEntregador(entregador);
    setFormData({
      nome: entregador.nome,
      telefone: entregador.telefone,
      unidade: entregador.unidade,
      dias_trabalho: entregador.dias_trabalho || DEFAULT_DIAS_TRABALHO,
      usar_turno_padrao: entregador.usar_turno_padrao !== false,
      turno_inicio: entregador.turno_inicio?.slice(0, 5) || TURNO_PADRAO.inicio.slice(0, 5),
      turno_fim: entregador.turno_fim?.slice(0, 5) || TURNO_PADRAO.fim.slice(0, 5),
    });
    setIsGeneratingVoice(false);
    setIsFormOpen(true);
  };

  const handleToggleAtivo = (entregador: Entregador) => {
    const isActivating = !entregador.ativo;
    const updateData: Partial<Entregador> = { ativo: isActivating };

    if (isActivating) {
      updateData.fila_posicao = new Date().toISOString();
      // Se não tiver hora_saida (primeiro check-in do dia), define agora
      if (!entregador.hora_saida) {
        updateData.hora_saida = new Date().toISOString();
      }
    }

    updateMutation.mutate({
      id: entregador.id,
      data: updateData,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este entregador?')) {
      const entregador = entregadores.find((e) => e.id === id);
      
      if (entregador?.tts_voice_path) {
        try {
          const { error: storageError } = await supabase.storage
            .from('motoboy_voices')
            .remove([entregador.tts_voice_path]);
            
          if (storageError) {
            console.error('Erro ao excluir áudio do storage:', storageError);
          }
        } catch (e) {
          console.error('Erro ao excluir áudio do storage:', e);
        }
      }
      
      deleteMutation.mutate(id);
    }
  };

  const handleDiaChange = (dia: keyof DiasTrabalho, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      dias_trabalho: {
        ...prev.dias_trabalho,
        [dia]: checked,
      },
    }));
  };

  const activeCount = entregadores.filter((e) => e.ativo).length;

  const handleGenerateBagVoices = async () => {
    if (!user?.franquiaId) {
      toast.error('É necessário estar vinculado a uma franquia.');
      return;
    }

    const tvTts = (franquiaConfig?.config_pagamento as any)?.tv_tts;
    const elevenVoiceId = tvTts?.eleven_voice_id as string | undefined;
    const isEleven = tvTts?.voice_model === 'elevenlabs';
    const isGoogle = tvTts?.voice_model === 'google';
    const isOpenRouter = tvTts?.voice_model === 'openrouter';

    if (!tvTts || (!isEleven && !isGoogle && !isOpenRouter)) {
      toast.error('Configure um provedor de voz (OpenRouter, Google ou ElevenLabs) na aba Módulos antes de gerar os áudios.');
      return;
    }

    if (isEleven && !elevenVoiceId) {
      toast.error('Configure o Voice ID do ElevenLabs antes de gerar os áudios.');
      return;
    }

    const bagsAtivas = franquiaBagTipos.filter((b) => b.ativo);
    if (bagsAtivas.length === 0) {
      toast.info('Nenhum tipo de bag ativo encontrado.');
      return;
    }

    setIsGeneratingAllVoices(true);
    let sucesso = 0;
    let falhas = 0;

    try {
      // Gerar áudio para cada bag
      for (const bag of bagsAtivas) {
        try {
          const texto = `Pegue a bag ${bag.nome}`;
          const extension = isOpenRouter ? 'wav' : 'mp3';
          const path = `${user.franquiaId}/bags/${bag.id}.${extension}`;

          const endpoint = isOpenRouter
            ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-tts`
            : isGoogle
              ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`
              : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

          const requestBody = isOpenRouter
            ? {
                text: texto,
                voice: tvTts?.openrouter_voice || 'sabrina',
                model: tvTts?.openrouter_model || 'heygen/heygen-voice-1-turbo:free',
                filename: path,
                franquia_id: user.franquiaId,
                api_key: tvTts?.openrouter_api_key || undefined,
              }
            : isGoogle
              ? {
                  text: texto,
                  voice_name: tvTts?.google_voice_name,
                  filename: path,
                  franquia_id: user.franquiaId,
                  api_key: tvTts?.google_api_key || undefined,
                }
              : {
                  text: texto,
                  voiceId: elevenVoiceId,
                  franquiaId: user.franquiaId,
                };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            falhas++;
            continue;
          }

          if (isEleven) {
            const audioBlob = await response.blob();
            const { error: uploadError } = await supabase.storage
              .from('motoboy_voices')
              .upload(path, audioBlob, { upsert: true, contentType: 'audio/mpeg' });

            if (uploadError) {
              falhas++;
              continue;
            }
          }

          sucesso++;
          await new Promise((resolve) => setTimeout(resolve, isOpenRouter ? 1500 : 3000));
        } catch (e) {
          console.error('Erro ao gerar áudio da bag:', bag.id, e);
          falhas++;
        }
      }

      // Gerar áudio de bebida usando o provedor ativo
      try {
        const textoBebida = 'Atenção! O pedido possui refrigerante!';
        const extension = isOpenRouter ? 'wav' : 'mp3';
        const pathBebida = `${user.franquiaId}/bebida.${extension}`;

        const endpointBebida = isOpenRouter
          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-tts`
          : isGoogle
            ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`
            : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

        const requestBodyBebida = isOpenRouter
          ? {
              text: textoBebida,
              voice: tvTts?.openrouter_voice || 'sabrina',
              model: tvTts?.openrouter_model || 'heygen/heygen-voice-1-turbo:free',
              filename: pathBebida,
              franquia_id: user.franquiaId,
              api_key: tvTts?.openrouter_api_key || undefined,
            }
          : isGoogle
            ? {
                text: textoBebida,
                voice_name: tvTts?.google_voice_name,
                filename: pathBebida,
                franquia_id: user.franquiaId,
                api_key: tvTts?.google_api_key || undefined,
              }
            : {
                text: textoBebida,
                voiceId: elevenVoiceId,
                franquiaId: user.franquiaId,
              };

        const responseBebida = await fetch(endpointBebida, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(requestBodyBebida),
        });

        if (responseBebida.ok) {
          if (isEleven) {
            const audioBlob = await responseBebida.blob();
            await supabase.storage
              .from('motoboy_voices')
              .upload(pathBebida, audioBlob, { upsert: true, contentType: 'audio/mpeg' });
          }
          sucesso++;
        }
      } catch (e) {
        console.error('Erro ao gerar áudio de bebida:', e);
      }

      if (sucesso > 0) {
        toast.success(`${sucesso} áudios de bags/bebida gerados com sucesso!${falhas ? ` Falhas: ${falhas}` : ''}`);
      } else {
        toast.error('Não foi possível gerar os áudios.');
      }
    } finally {
      setIsGeneratingAllVoices(false);
      refetchAudios();
    }
  };

  const handleClearBagAudios = async () => {
    if (!user?.franquiaId) {
      toast.error('É necessário estar vinculado a uma franquia.');
      return;
    }

    const confirmClear = window.confirm(
      'Tem certeza que deseja remover apenas os áudios das bags? Os áudios dos motoboys serão mantidos.',
    );

    if (!confirmClear) return;

    try {
      // Deletar pasta de bags
      const { data: bagFiles } = await supabase.storage
        .from('motoboy_voices')
        .list(`${user.franquiaId}/bags`);

      if (bagFiles && bagFiles.length > 0) {
        const filesToRemove = bagFiles.map((f) => `${user.franquiaId}/bags/${f.name}`);
        await supabase.storage.from('motoboy_voices').remove(filesToRemove);
      }

      // Deletar áudio de bebida (.mp3 e .wav)
      await supabase.storage
        .from('motoboy_voices')
        .remove([`${user.franquiaId}/bebida.mp3`, `${user.franquiaId}/bebida.wav`]);

      refetchAudios();
      toast.success('Áudios das bags removidos com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar áudios das bags:', error);
      toast.error('Erro ao limpar áudios das bags.');
    }
  };

  const handleDeleteAudioFile = async (item: any) => {
    if (!user?.franquiaId) return;
    const displayName = item.bagNome ? `${item.bagNome} (${item.name})` : item.name;
    const confirmDelete = window.confirm(`Tem certeza que deseja desvincular/excluir o áudio "${displayName}"?`);
    if (!confirmDelete) return;

    try {
      // 1. Se estiver vinculado via audio_url na tabela franquia_bag_tipos, remove o link
      if (item.bagId) {
        await supabase
          .from('franquia_bag_tipos')
          .update({ audio_url: null })
          .eq('id', item.bagId);
      }

      // 2. Se for arquivo físico no storage, remove
      if (item.storagePath) {
        await supabase.storage.from('motoboy_voices').remove([item.storagePath]);
      } else if (item.url) {
        const match = item.url.match(/motoboy_voices\/(.+)$/);
        if (match) {
          await supabase.storage.from('motoboy_voices').remove([decodeURIComponent(match[1])]);
        }
      }

      toast.success(`Áudio "${displayName}" removido com sucesso!`);
      refetchBagTipos();
      refetchAudios();
    } catch (e: any) {
      console.error('Erro ao excluir áudio:', e);
      toast.error('Erro ao excluir áudio.');
    }
  };

  const handleLinkAudioToBag = async (item: any, targetBagId: string) => {
    if (!user?.franquiaId || !targetBagId) return;
    if (item.bagId === targetBagId) {
      toast.info('Este áudio já está atrelado a esta bag.');
      return;
    }

    try {
      const targetBag = franquiaBagTipos.find((b) => b.id === targetBagId);
      const ext = item.name.split('.').pop() || 'mp3';

      if (item.source === 'url' && item.url) {
        // Modo URL: desvincula da bag antiga e vincula na nova bag
        if (item.bagId) {
          await supabase
            .from('franquia_bag_tipos')
            .update({ audio_url: null })
            .eq('id', item.bagId);
        }

        await supabase
          .from('franquia_bag_tipos')
          .update({ audio_url: item.url })
          .eq('id', targetBagId);

        toast.success(`Áudio atrelado à ${targetBag?.nome || 'Bag'}!`);
      } else {
        // Modo storage: move/copia o arquivo com o ID da nova bag
        const oldPath = item.storagePath || `${user.franquiaId}/bags/${item.name}`;
        const newPath = `${user.franquiaId}/bags/${targetBagId}.${ext}`;

        const { data: blob, error: downloadError } = await supabase.storage
          .from('motoboy_voices')
          .download(oldPath);
        if (downloadError || !blob) throw downloadError || new Error('Arquivo não encontrado no Storage');

        const { error: uploadError } = await supabase.storage
          .from('motoboy_voices')
          .upload(newPath, blob, {
            upsert: true,
            contentType: ext === 'wav' ? 'audio/wav' : 'audio/mpeg',
          });
        if (uploadError) throw uploadError;

        await supabase.storage.from('motoboy_voices').remove([oldPath]);
        toast.success(`Áudio atrelado à ${targetBag?.nome || 'Bag'}!`);
      }

      refetchBagTipos();
      refetchAudios();
    } catch (e: any) {
      console.error('Erro ao atrelar áudio à bag:', e);
      toast.error('Erro ao atrelar áudio à bag.');
    }
  };

  const handleGenerateAllVoices = async () => {
    if (!user?.franquiaId) {
      toast.error('É necessário estar vinculado a uma franquia para gerar vozes.');
      return;
    }

    const tvTts = (franquiaConfig?.config_pagamento as any)?.tv_tts;
    const elevenVoiceId = tvTts?.eleven_voice_id as string | undefined;
    const isEleven = tvTts?.voice_model === 'elevenlabs';
    const isGoogle = tvTts?.voice_model === 'google';
    const isOpenRouter = tvTts?.voice_model === 'openrouter';

    if (!tvTts || (!isEleven && !isGoogle && !isOpenRouter)) {
      toast.error('Configure um provedor de voz (OpenRouter, Google ou ElevenLabs) na aba Módulos antes de gerar as vozes.');
      return;
    }

    if (isEleven && !elevenVoiceId) {
      toast.error('Configure o Voice ID do ElevenLabs na aba Módulos antes de gerar as vozes.');
      return;
    }

    const semVoz = entregadores.filter((e) => !e.tts_voice_path);

    if (semVoz.length === 0) {
      toast.info('Todos os motoboys desta unidade já possuem voz gerada.');
      return;
    }

    setIsGeneratingAllVoices(true);
    setVoicesProgress({ current: 0, total: semVoz.length });
    cancelVoicesRef.current = false;
    let sucesso = 0;
    let falhas = 0;
    let cancelado = false;

    try {
      for (let index = 0; index < semVoz.length; index++) {
        const motoboy = semVoz[index];

        if (cancelVoicesRef.current) {
          cancelado = true;
          break;
        }

        setVoicesProgress({ current: index + 1, total: semVoz.length });

        try {
          const texto = `${motoboy.nome}, é a sua vez!`;
          const extension = isOpenRouter ? 'wav' : 'mp3';
          const path = `${user.franquiaId}/${motoboy.id}.${extension}`;

          const endpoint = isOpenRouter
            ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-tts`
            : isGoogle
              ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`
              : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

          const requestBody = isOpenRouter
            ? {
                text: texto,
                voice: tvTts?.openrouter_voice || 'sabrina',
                model: tvTts?.openrouter_model || 'heygen/heygen-voice-1-turbo:free',
                filename: path,
                franquia_id: user.franquiaId,
                api_key: tvTts?.openrouter_api_key || undefined,
              }
            : isGoogle
              ? {
                  text: texto,
                  voice_name: tvTts?.google_voice_name,
                  filename: path,
                  franquia_id: user.franquiaId,
                  api_key: tvTts?.google_api_key || undefined,
                }
              : {
                  text: texto,
                  voiceId: elevenVoiceId,
                  franquiaId: user.franquiaId,
                  sequenceIndex: index,
                };

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(requestBody),
          });

          if (!response.ok) {
            const errText = await response.text();
            console.error('Erro ao gerar voz fixa (lote):', errText);
            falhas++;
            continue;
          }

          if (isEleven) {
            const audioBlob = await response.blob();
            const { error: uploadError } = await supabase.storage
              .from('motoboy_voices')
              .upload(path, audioBlob, {
                upsert: true,
                contentType: 'audio/mpeg',
              });

            if (uploadError) {
              console.error('Erro ao salvar MP3 no storage (lote):', uploadError);
              falhas++;
              continue;
            }
          }

          await updateEntregador(motoboy.id, { tts_voice_path: path });
          sucesso++;

          // Delay entre cada geração para respeitar limites de API
          const delayMs = isOpenRouter ? 2000 : isGoogle ? 500 : 10000;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } catch (e) {
          console.error('Erro ao gerar voz fixa em lote para motoboy:', motoboy.id, e);
          falhas++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['entregadores'] });

      if (cancelado) {
        toast.info(`Geração de vozes cancelada. Sucesso em ${sucesso}, falhas em ${falhas}.`);
      } else if (sucesso > 0) {
        toast.success(`Vozes geradas com sucesso para ${sucesso} motoboys.${falhas ? ` Falhas em ${falhas}.` : ''}`);
      } else {
        toast.error('Não foi possível gerar voz para nenhum motoboy.');
      }
    } finally {
      setIsGeneratingAllVoices(false);
      setVoicesProgress(null);
    }
  };

  const handleClearAllVoices = async () => {
    if (!user?.franquiaId) {
      toast.error('É necessário estar vinculado a uma franquia para limpar as vozes.');
      return;
    }

    const confirmClear = window.confirm(
      'Tem certeza que deseja remover as vozes apenas dos motoboys DESTA unidade? Isso não pode ser desfeito.',
    );

    if (!confirmClear) return;

    try {
      const entregadoresComVoz = entregadores.filter((e) => e.tts_voice_path);
      if (entregadoresComVoz.length === 0) {
        toast.info('Nenhum motoboy da unidade atual possui voz salva.');
        return;
      }

      const filesToRemove = entregadoresComVoz.map((e) => e.tts_voice_path!);
      const { error: deleteStorageError } = await supabase.storage
        .from('motoboy_voices')
        .remove(filesToRemove);

      if (deleteStorageError) {
        console.error('Erro ao limpar storage:', deleteStorageError);
        toast.error('Ocorreu um erro ao excluir os arquivos do storage.');
        return;
      }

      // Remover do Banco de Dados
      const ids = entregadoresComVoz.map((e) => e.id);
      const { error: updateError } = await supabase
        .from('entregadores')
        .update({ tts_voice_path: null })
        .in('id', ids);

      if (updateError) {
        console.error('Erro ao limpar tts_voice_path via frontend:', updateError);
      }

      await queryClient.invalidateQueries({ queryKey: ['entregadores'] });
      refetchAudios();
      toast.success('Todas as vozes da unidade atual foram removidas.');
    } catch (error) {
      console.error('Erro inesperado ao limpar vozes da unidade:', error);
      toast.error('Erro inesperado ao limpar as vozes.');
    }
  };

  const hiddenBagAudioRef = useRef<HTMLInputElement | null>(null);
  const handleImportBagsAudios = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !user?.franquiaId) return;

    let sucesso = 0;
    let falhas = 0;

    toast.info('Iniciando importação de áudios de bags...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) {
        falhas++;
        continue;
      }

      // Procura uma BAG com o nome igual ao nome do arquivo (sem o .mp3)
      const fileNameWithoutExt = file.name.replace(/\.mp3$/i, '').trim().toLowerCase();
      const bagCorrespondente = franquiaBagTipos.find(
        (b) => b.nome.trim().toLowerCase() === fileNameWithoutExt
      );

      if (!bagCorrespondente) {
        console.warn(`BAG não encontrada para o arquivo: ${file.name}`);
        falhas++;
        continue;
      }

      const filePath = `${user.franquiaId}/bags/${bagCorrespondente.id}.mp3`;
      const { error } = await supabase.storage
        .from('motoboy_voices')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) {
        console.error(`Erro ao subir ${file.name}:`, error);
        falhas++;
      } else {
        sucesso++;
      }
    }

    if (hiddenBagAudioRef.current) hiddenBagAudioRef.current.value = '';

    refetchAudios();
    if (sucesso > 0) {
      toast.success(`Foram importados ${sucesso} áudios de bags com sucesso! ${falhas ? `Falha em ${falhas}.` : ''}`);
    } else {
      toast.error(`Nenhum áudio foi correspondido com as bags criadas (verifique o nome do arquivo). Arquivos ignorados: ${falhas}.`);
    }
  };

  return (
    <Layout>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackButton />
        <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-4 sm:ml-auto">
          <span className="text-xs sm:text-sm text-muted-foreground">
            Logado como: <strong>{user?.username}</strong>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="gap-2 w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>

      <div className="mb-10 space-y-3">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">Configuração</h1>
        <p className="text-muted-foreground text-lg">
          Gerencie os entregadores e parâmetros da unidade{' '}
          <span className="font-semibold text-primary px-3 py-1 bg-primary/10 rounded-lg ml-1">{selectedUnit}</span>
        </p>
      </div>

      {isPaymentBlocked && isFranquiaAdmin && (
        <Dialog open={paymentBlockedOpen} onOpenChange={setPaymentBlockedOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono text-lg">Franquia bloqueada por pagamento</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Seu acesso ao sistema está temporariamente restrito devido à pendência de pagamento.
              Use a aba <span className="font-semibold">Financeiro</span> para regularizar a situação e
              liberar novamente todas as funcionalidades.
            </p>
          </DialogContent>
        </Dialog>
      )}

      <Tabs defaultValue={initialTab} className="space-y-6">
        <div className="sticky top-0 z-40 py-2 bg-background/80 backdrop-blur-xl border-b border-border/50 mb-8">
          <TabsList className="w-full flex flex-wrap sm:flex-nowrap items-center justify-start gap-2 bg-transparent h-auto p-0 border-none overflow-x-auto hide-scrollbar pb-2 sm:pb-0">
            <TabsTrigger
              value="motoboys"
              className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Motoboys</span>
              <span className="sm:hidden font-semibold">Motos</span>
            </TabsTrigger>

            <TabsTrigger
              value="usuarios"
              className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Usuários</span>
              <span className="sm:hidden font-semibold">Users</span>
            </TabsTrigger>

            <TabsTrigger
              value="modulos"
              className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Módulos</span>
              <span className="sm:hidden font-semibold">Mods</span>
            </TabsTrigger>

            <TabsTrigger
              value="loja"
              className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Dados da Loja</span>
              <span className="sm:hidden font-semibold">Loja</span>
            </TabsTrigger>

            {isModuloAtivoLocal('controle_maquininhas') && (
              <TabsTrigger
                value="maquininhas"
                className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold">Maquininhas</span>
                <span className="sm:hidden font-semibold">Maqs</span>
              </TabsTrigger>
            )}

            <TabsTrigger
              value="etiquetas"
              className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Etiquetas</span>
              <span className="sm:hidden font-semibold">Etiq</span>
            </TabsTrigger>

            <TabsTrigger
              value="webhook"
              className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Integrações</span>
              <span className="sm:hidden font-semibold">Webhooks</span>
            </TabsTrigger>

            {user?.role === 'admin_franquia' && (
              <TabsTrigger
                value="financeiro"
                className="flex-1 sm:flex-none gap-2 px-6 py-2.5 rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 border border-transparent data-[state=active]:border-primary/20 hover:bg-muted/50"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold">Financeiro</span>
                <span className="sm:hidden font-semibold">$</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="motoboys" className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtros */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterTurno}
                  onValueChange={(v) => setFilterTurno(v as typeof filterTurno)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Turno" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="all">Todos turnos</SelectItem>
                    <SelectItem value="padrao">Turno padrão</SelectItem>
                    <SelectItem value="custom">Turno custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto">
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm w-full">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Ações de Expediente e Sistema
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap items-stretch gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateAllVoices}
                    disabled={isGeneratingAllVoices}
                    className="gap-2 text-xs sm:text-sm min-h-[48px]"
                  >
                    {isGeneratingAllVoices ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {voicesProgress
                          ? `Gerando voz ${voicesProgress.current}/${voicesProgress.total}`
                          : 'Gerando Vozes...'}
                      </>
                    ) : (
                      'Gerar Vozes Motoboys'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateBagVoices}
                    disabled={isGeneratingAllVoices}
                    className="gap-2 text-xs sm:text-sm min-h-[48px]"
                  >
                    Gerar Áudios Bags
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 min-h-[48px]"
                    onClick={handleClearAllVoices}
                    title="Apagar todos os áudios desta unidade local"
                    disabled={isGeneratingAllVoices}
                  >
                    Limpar Vozes
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 min-h-[48px]"
                    onClick={handleClearBagAudios}
                    title="Apagar todos os áudios de bolsas desta franquia"
                    disabled={isGeneratingAllVoices}
                  >
                    Limpar Bags
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 min-h-[48px]"
                    onClick={() => hiddenBagAudioRef.current?.click()}
                    title="Importar arquivos MP3 com o mesmo nome das bolsas"
                    disabled={isGeneratingAllVoices}
                  >
                    <Upload className="w-4 h-4" /> Importar Bags
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setResetDialogOpen(true)}
                    className="gap-2 w-full xl:w-auto xl:ml-auto min-h-[48px] shadow-sm order-first xl:order-none"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset de Expediente
                  </Button>
                  <input
                    type="file"
                    accept="audio/mpeg,.mp3"
                    multiple
                    ref={hiddenBagAudioRef}
                    className="hidden"
                    onChange={handleImportBagsAudios}
                  />
                </div>
              </div>
              {isGeneratingAllVoices && voicesProgress && (
                <div className="flex items-center gap-2 w-full max-w-xs md:max-w-sm ml-auto">
                  <div className="flex-1 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(voicesProgress.current / voicesProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {voicesProgress.current}/{voicesProgress.total}
                  </span>
                </div>
              )}

              {/* Preview de áudios de bags/bebida */}
              {generatedAudios && (generatedAudios.bags.length > 0 || generatedAudios.bebida) && (
                <div className="mb-2 md:mb-0 w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAudioPreview(!showAudioPreview)}
                    className="gap-2 text-xs w-full justify-between md:w-auto md:justify-start"
                  >
                    <span>{showAudioPreview ? '▼' : '▶'} Áudios Gerados</span>
                    <span className="text-[11px] text-muted-foreground">
                      ({generatedAudios.bags.length} bags
                      {generatedAudios.bebida ? ' + bebida' : ''})
                    </span>
                  </Button>

                  {showAudioPreview && (
                    <div className="mt-3 p-3 md:p-4 border rounded-lg bg-card space-y-4 text-xs animate-in fade-in duration-200">
                      {/* Bags */}
                      {generatedAudios.bags.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-muted-foreground flex items-center gap-1.5">
                              <span>🎒 Áudios das Bags ({generatedAudios.bags.length})</span>
                            </h4>
                            <span className="text-[10px] text-muted-foreground">
                              Ouça, exclua ou altere a qual bag cada áudio está atrelado
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {generatedAudios.bags.map((file: any) => {
                              const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
                              const bagId = file.bagId || file.name.replace(/\.(mp3|wav|ogg|m4a)$/i, '');
                              const linkedBag = franquiaBagTipos.find((b) => b.id === bagId) || (file.bagNome ? { id: bagId, nome: file.bagNome } : null);

                              return (
                                <div
                                  key={file.name + (file.bagId || '')}
                                  className="flex flex-col justify-between p-2.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors gap-2"
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-xs text-foreground truncate max-w-[160px]">
                                          {linkedBag ? linkedBag.nome : 'Bag Não Atrelada'}
                                        </span>
                                        <span
                                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                                            ext === 'wav'
                                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                          }`}
                                        >
                                          {ext}
                                        </span>
                                        {file.source === 'url' && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-medium">
                                            Link Galeria
                                          </span>
                                        )}
                                      </div>
                                      <p
                                        className="text-[10px] text-muted-foreground truncate font-mono mt-0.5"
                                        title={file.name}
                                      >
                                        {linkedBag ? `Arquivo: ${file.name}` : `Órfão: ${file.name}`}
                                      </p>
                                    </div>

                                    {/* Botão de Excluir / Desvincular Áudio */}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                      title="Desvincular ou excluir este áudio"
                                      onClick={() => handleDeleteAudioFile(file)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>

                                  {/* Ações: Tocar e Atrelar */}
                                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/50">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[11px] gap-1 shrink-0"
                                      onClick={async () => {
                                        try {
                                          if (file.url) {
                                            const audio = new Audio(file.url);
                                            await audio.play();
                                            return;
                                          }
                                          const { data } = await supabase.storage
                                            .from('motoboy_voices')
                                            .download(file.storagePath || `${user?.franquiaId}/bags/${file.name}`);
                                          if (data) {
                                            const url = URL.createObjectURL(data);
                                            const audio = new Audio(url);
                                            await audio.play();
                                            audio.onended = () => URL.revokeObjectURL(url);
                                          }
                                        } catch (e) {
                                          toast.error('Erro ao reproduzir áudio');
                                        }
                                      }}
                                    >
                                      ▶️ Ouvir
                                    </Button>

                                    {/* Seletor para atrelar/reatrelar à bag */}
                                    <Select
                                      value={linkedBag ? linkedBag.id : ''}
                                      onValueChange={(newBagId) =>
                                        handleLinkAudioToBag(file, newBagId)
                                      }
                                    >
                                      <SelectTrigger className="h-7 text-[11px] flex-1 py-0 px-2 truncate bg-background">
                                        <SelectValue placeholder="Atrelar à bag..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {franquiaBagTipos.map((b) => (
                                          <SelectItem key={b.id} value={b.id} className="text-xs">
                                            {b.nome} {b.id === bagId ? '✓ (Atual)' : ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Bebida */}
                      {generatedAudios.bebida && (
                        <div className="pt-2 border-t border-border/60">
                          <h4 className="font-semibold mb-2 text-muted-foreground flex items-center gap-1.5">
                            <span>🥤 Áudio de Bebida</span>
                          </h4>
                          <div className="inline-flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] gap-1.5 h-7 px-2.5"
                              onClick={async () => {
                                try {
                                  const { data } = await supabase.storage
                                    .from('motoboy_voices')
                                    .download(`${user?.franquiaId}/${generatedAudios.bebida}`);
                                  if (data) {
                                    const url = URL.createObjectURL(data);
                                    const audio = new Audio(url);
                                    await audio.play();
                                    audio.onended = () => URL.revokeObjectURL(url);
                                  }
                                } catch (e) {
                                  toast.error('Erro ao reproduzir áudio');
                                }
                              }}
                            >
                              ▶️ Ouvir Aviso de Bebida (
                              {generatedAudios.bebida.split('.').pop()?.toUpperCase()})
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Excluir áudio de bebida"
                              onClick={() =>
                                handleDeleteAudioFile(
                                  `${user?.franquiaId}/${generatedAudios.bebida}`,
                                  generatedAudios.bebida,
                                )
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={() => setIsFormOpen(true)}
                className="gap-2 w-full md:w-auto justify-center min-h-[48px]"
              >
                <Plus className="w-4 h-4" />
                Novo Motoboy
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total cadastrados</p>
                  <p className="text-2xl font-bold font-mono">{entregadores.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-status-available/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-status-available" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold font-mono">{activeCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <BulkMotoboyImport unidade={selectedUnit as Unidade} />
              {filteredEntregadores.length === 0 ? (
                <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    {entregadores.length === 0
                      ? 'Nenhum entregador cadastrado nesta unidade'
                      : 'Nenhum entregador encontrado com os filtros aplicados'}
                  </p>
                  <Button onClick={() => setIsFormOpen(true)} variant="outline">
                    Cadastrar motoboy
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredEntregadores.map((entregador) => (
                    <EntregadorCard
                      key={entregador.id}
                      entregador={entregador}
                      onEdit={() => handleEdit(entregador)}
                      onDelete={() => handleDelete(entregador.id)}
                      onToggleAtivo={() => handleToggleAtivo(entregador)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersManagement />
        </TabsContent>

        <TabsContent value="loja">
          <DadosDaLoja />
        </TabsContent>

        <TabsContent value="modulos">
          <div className="space-y-6">
            {/* Gerenciador de Plano (admin_franquia) */}
            {user?.role === 'admin_franquia' && (
              <FranquiaPlanoManager
                overrideUnidadeId={resolvedUnidadeId}
              />
            )}

            {/* TV Config - gated behind configurar_chamadas_tv module */}
            {tvCallModuleActive && (
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Configurações do Módulo TV</h3>
                  <p className="text-sm text-muted-foreground">Personalize as chamadas exibidas na tela da TV</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setTvCallConfigOpen(true)}
                  className="gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="7" width="20" height="10" rx="2" strokeWidth="2" />
                    <path d="M17 17v3M7 17v3M12 13h.01" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Configurar Chamadas da TV
                </Button>
              </div>
            )}
            <ModulosConfig />
          </div>
        </TabsContent>

        <TabsContent value="maquininhas" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <MaquininhaManagement />
        </TabsContent>

        <TabsContent value="etiquetas" className="space-y-6">
          <EtiquetasConfigPanel />
        </TabsContent>

        <TabsContent value="webhook">
          <div className="space-y-6">
            <WebhookConfig overrideUnidadeId={resolvedUnidadeId} />
            {isModuloAtivoLocal('whatsapp') && <WhatsAppTemplates />}
          </div>
        </TabsContent>

        {user?.role === 'admin_franquia' && (
          <TabsContent value="financeiro" className="space-y-4">
            <FranquiaFinanceiroPanel />
          </TabsContent>
        )}
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingEntregador ? 'Editar Motoboy' : 'Novo Motoboy'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nome: e.target.value }))
                }
                placeholder="Nome do motoboy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Celular (com DDD)</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, telefone: e.target.value }))
                }
                placeholder="11999999999"
              />
            </div>

            {!editingEntregador && user?.role === 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="unidade">Unidade</Label>
                <Select
                  value={formData.unidade}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, unidade: value as Unidade }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ITAQUA">Itaquaquecetuba</SelectItem>
                    <SelectItem value="POA">Poá</SelectItem>
                    <SelectItem value="SUZANO">Suzano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dias de Trabalho */}
            <div className="space-y-3">
              <Label>Dias de Trabalho</Label>
              <div className="grid grid-cols-2 gap-2">
                {DIAS_SEMANA.map((dia) => (
                  <div key={dia.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`dia-${dia.key}`}
                      checked={formData.dias_trabalho[dia.key]}
                      onCheckedChange={(checked) =>
                        handleDiaChange(dia.key, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`dia-${dia.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>



            {/* WhatsApp toggle por motoboy */}
            {editingEntregador && isModuloAtivoLocal('whatsapp') && (
              <div className="flex items-center justify-between border border-border rounded-lg p-4">
                <div>
                  <Label>Mensagens WhatsApp</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se desativado, este motoboy não receberá mensagens via WhatsApp.
                  </p>
                </div>
                <Switch
                  checked={editingEntregador.whatsapp_ativo !== false}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({
                      id: editingEntregador.id,
                      data: { whatsapp_ativo: checked },
                    });
                    setEditingEntregador({ ...editingEntregador, whatsapp_ativo: checked });
                  }}
                />
              </div>
            )}

            {/* Importar áudio próprio do motoboy e Galeria */}
            {editingEntregador && (
              <div className="space-y-3 border border-border rounded-lg p-4 bg-secondary/40">
                <div className="flex items-start justify-between">
                  <div>
                    <Label>Áudio Próprio / Galeria</Label>
                    <p className="text-xs text-muted-foreground mt-1 text-balance">
                      Envie um MP3 do seu computador ou reutilize um som da Galeria de Mídia.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 h-8"
                    onClick={() => setGalleryOpenForEntregador(true)}
                  >
                    Mídias
                  </Button>
                </div>

                <Input
                  type="file"
                  accept="audio/mpeg,audio/mp3"
                  className="mt-2"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !user?.franquiaId || !editingEntregador) return;
                    try {
                      const path = `${user.franquiaId}/${editingEntregador.id}.mp3`;
                      const { error: uploadError } = await supabase.storage
                        .from('motoboy_voices')
                        .upload(path, file, { upsert: true, contentType: 'audio/mpeg' });
                      if (uploadError) throw uploadError;
                      const updated = await updateEntregador(editingEntregador.id, { tts_voice_path: path });
                      setEditingEntregador(updated);
                      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
                      toast.success('Áudio importado com sucesso!');
                    } catch (err) {
                      toast.error('Erro ao importar áudio via arquivo local.');
                    }
                  }}
                />
              </div>
            )}

            {/* Voz fixa por motoboy */}
            {editingEntregador && (
              <div className="space-y-3 border border-border rounded-lg p-4 bg-secondary/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label>
                      Voz personalizada (
                      {(franquiaConfig?.config_pagamento as any)?.tv_tts?.voice_model === 'google'
                        ? 'Google'
                        : (franquiaConfig?.config_pagamento as any)?.tv_tts?.voice_model === 'openrouter'
                        ? 'OpenRouter'
                        : 'ElevenLabs'}
                      )
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gera um áudio fixo com o nome deste motoboy usando{' '}
                      {(franquiaConfig?.config_pagamento as any)?.tv_tts?.voice_model === 'google'
                        ? 'Google'
                        : (franquiaConfig?.config_pagamento as any)?.tv_tts?.voice_model === 'openrouter'
                        ? 'OpenRouter'
                        : 'ElevenLabs'}
                      . Depois a TV usa sempre esse arquivo gravado.
                    </p>
                  </div>
                  {editingEntregador.tts_voice_path && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Voz já gerada
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={async () => {
                          try {
                            const path = editingEntregador.tts_voice_path!;
                            if (path.startsWith('http')) {
                              const audio = new Audio(path);
                              await audio.play();
                              return;
                            }
                            const { data } = await supabase.storage
                              .from('motoboy_voices')
                              .download(path);

                            if (data) {
                              const audioUrl = URL.createObjectURL(data);
                              const audio = new Audio(audioUrl);
                              await audio.play();
                              audio.onended = () => URL.revokeObjectURL(audioUrl);
                            }
                          } catch (e) {
                            toast.error('Erro ao reproduzir áudio');
                          }
                        }}
                      >
                        ▶️ Ouvir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={async () => {
                          try {
                            const path = editingEntregador.tts_voice_path!;
                            if (path.startsWith('http')) {
                              window.open(path, '_blank');
                              return;
                            }

                            const { data } = await supabase.storage
                              .from('motoboy_voices')
                              .download(path);

                            if (data) {
                              const url = URL.createObjectURL(data);
                              const ext = path.endsWith('.wav') ? 'wav' : 'mp3';
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `voz_${editingEntregador.nome.replace(/\s/g, '_')}.${ext}`;
                              a.click();
                              URL.revokeObjectURL(url);
                              toast.success('Áudio baixado!');
                            }
                          } catch (e) {
                            toast.error('Erro ao baixar áudio');
                          }
                        }}
                      >
                        ⬇️ Baixar
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="mt-2"
                  disabled={isGeneratingVoice || !user?.franquiaId}
                  onClick={async () => {
                    if (!editingEntregador || !user?.franquiaId) return;

                    const tvTts = (franquiaConfig?.config_pagamento as any)?.tv_tts;
                    const elevenVoiceId = tvTts?.eleven_voice_id as string | undefined;
                    const googleVoiceName = tvTts?.google_voice_name as string | undefined;

                    const isEleven = tvTts?.voice_model === 'elevenlabs';
                    const isGoogle = tvTts?.voice_model === 'google';
                    const isOpenRouter = tvTts?.voice_model === 'openrouter';

                    if (!tvTts || (!isEleven && !isGoogle && !isOpenRouter)) {
                      toast.error('Configure um provedor de voz (OpenRouter, Google ou ElevenLabs) na aba Módulos antes de gerar.');
                      return;
                    }

                    if (isEleven && !elevenVoiceId) {
                      toast.error('Configure o Voice ID do ElevenLabs antes de gerar.');
                      return;
                    }

                    if (isGoogle && !googleVoiceName) {
                      toast.error('Configure a voz do Google antes de gerar.');
                      return;
                    }

                    try {
                      setIsGeneratingVoice(true);
                      const texto = `${editingEntregador.nome}, é a sua vez!`;
                      const extension = isOpenRouter ? 'wav' : 'mp3';
                      const path = `${user.franquiaId}/${editingEntregador.id}.${extension}`;

                      const endpoint = isOpenRouter
                        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/openrouter-tts`
                        : isGoogle
                          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`
                          : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

                      const requestBody = isOpenRouter
                        ? {
                            text: texto,
                            voice: tvTts?.openrouter_voice || 'sabrina',
                            model: tvTts?.openrouter_model || 'heygen/heygen-voice-1-turbo:free',
                            filename: path,
                            franquia_id: user.franquiaId,
                            api_key: tvTts?.openrouter_api_key || undefined,
                          }
                        : isGoogle
                          ? {
                              text: texto,
                              voice_name: tvTts?.google_voice_name,
                              filename: path,
                              franquia_id: user.franquiaId,
                              api_key: tvTts?.google_api_key || undefined,
                            }
                          : {
                              text: texto,
                              voiceId: tvTts?.eleven_voice_id,
                              franquiaId: user.franquiaId,
                            };

                      const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                        },
                        body: JSON.stringify(requestBody),
                      });

                      if (!response.ok) {
                        const errText = await response.text();
                        console.error('Erro ao gerar voz:', errText);
                        toast.error('Erro ao gerar voz.');
                        return;
                      }

                      // Se for ElevenLabs, ainda precisamos fazer o upload do blob aqui
                      if (isEleven) {
                        const audioBlob = await response.blob();
                        const { error: uploadError } = await supabase.storage
                          .from('motoboy_voices')
                          .upload(path, audioBlob, {
                            upsert: true,
                            contentType: 'audio/mpeg',
                          });

                        if (uploadError) {
                          console.error('Erro ao salvar MP3 no storage:', uploadError);
                          toast.error('Erro ao salvar o arquivo de voz.');
                          return;
                        }
                      }

                      // Atualiza o banco de dados (comum para ambos)
                      const updated = await updateEntregador(editingEntregador.id, {
                        tts_voice_path: path,
                      });

                      setEditingEntregador(updated);
                      queryClient.invalidateQueries({ queryKey: ['entregadores'] });
                      toast.success('Voz personalizada gerada e salva com sucesso!');
                    } catch (e) {
                      console.error('Erro ao gerar voz fixa do motoboy:', e);
                      toast.error('Erro inesperado ao gerar a voz do motoboy.');
                    } finally {
                      setIsGeneratingVoice(false);
                    }
                  }}
                >
                  {isGeneratingVoice ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando voz...
                    </>
                  ) : (
                    (franquiaConfig?.config_pagamento as any)?.tv_tts?.voice_model === 'openrouter'
                      ? `🔊 Gerar voz personalizada (OpenRouter - ${(franquiaConfig?.config_pagamento as any)?.tv_tts?.openrouter_voice || 'Sabrina'})`
                      : (franquiaConfig?.config_pagamento as any)?.tv_tts?.voice_model === 'google' 
                      ? '🔊 Gerar voz personalizada (Google)' 
                      : '🔊 Gerar voz personalizada (ElevenLabs)'
                  )}
                </Button>
              </div>
            )}


            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingEntregador ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset de Expediente Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="w-[95vw] max-w-lg rounded-xl">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-xl">Reset de Expediente</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 text-base mt-2">
              <p>Tem certeza que deseja realizar o reset para a unidade <strong className="text-foreground">{selectedUnit}</strong>?</p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm text-foreground">
                <p>• Todos os motoboys serão <strong>desativados</strong> e voltarão ao status Disponível.</p>
                <p>• O ponto e horários da equipe interna (<strong>Janta & Ponto</strong>) serão resetados para o dia.</p>
                <p>• Histórico e Analytics serão <strong className="text-emerald-500">preservados</strong>.</p>
                <p className="text-destructive font-semibold">• O primeiro motoboy e a equipe deverão fazer check-in no próximo expediente.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <AlertDialogCancel className="mt-0 w-full sm:w-auto min-h-[48px] sm:min-h-0">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetDailyMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto min-h-[48px] sm:min-h-0"
              disabled={resetDailyMutation.isPending}
            >
              {resetDailyMutation.isPending ? 'Resetando...' : 'Confirmar Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de configuração de chamadas da TV */}
      <TVCallConfigModal
        open={tvCallConfigOpen}
        onOpenChange={setTvCallConfigOpen}
      />

      {user?.franquiaId && (
        <MediaGalleryModal
          open={galleryOpenForEntregador}
          onOpenChange={setGalleryOpenForEntregador}
          acceptedTypes={['audio']}
          onSelect={async (url) => {
            if (!editingEntregador) return;
            try {
              const updated = await updateEntregador(editingEntregador.id, { tts_voice_path: url });
              setEditingEntregador(updated);
              queryClient.invalidateQueries({ queryKey: ['entregadores'] });
              toast.success('Áudio da galeria vinculado ao motoboy com sucesso!');
            } catch (error) {
              toast.error('Erro ao vincular áudio da galeria.');
            }
          }}
        />
      )}
    </Layout>
  );
}



import React from 'react';
import { SuperAdminUpdates } from '@/components/admin/SuperAdminUpdates';
import { Layout } from '@/components/Layout';
import { UsersManagement } from '@/components/UsersManagement';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Loader2, Building2, Store, Users, Pencil, Plus, Trash2, Check, ChevronsUpDown, BarChart3, CalendarDays, DollarSign, Activity, Cpu, UserPlus, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Unidade } from '@/lib/api';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FranquiaBagsSection } from '@/components/FranquiaBagsSection';
import { PlanosModulosSection } from '@/components/PlanosModulosSection';
import { FranquiaDescontosPanel } from '@/components/FranquiaDescontosPanel';
import { BillingGatewayConfigPanel } from '@/components/BillingGatewayConfigPanel';
import { DataExportImport } from '@/components/DataExportImport';
import { SuperAdminFinanceiroTab } from '@/components/super-admin/SuperAdminFinanceiroTab';
import { SuperAdminFranquiasTab } from '@/components/super-admin/SuperAdminFranquiasTab';

interface Franquia {
  id: string;
  nome_franquia: string;
  slug: string;
  cpf_cnpj: string | null;
  plano_limite_lojas: number | null;
  status_pagamento: string | null;
  config_pagamento: any | null;
  data_vencimento: string | null;
  created_at: string | null;
  desconto_tipo?: string | null;
  desconto_valor?: number | null;
  desconto_percentual?: number | null;
  desconto_recorrente?: boolean | null;
}

interface UnidadeResumo {
  id: string;
  nome_loja: string;
  franquia_id: string;
}

interface Plano {
  id: string;
  nome: string;
  tipo: 'mensal' | 'anual';
  valor_base: number;
  descricao: string | null;
  duracao_meses: number;
  ativo: boolean;
}

interface UnidadePlano {
  id: string;
  unidade_id: string;
  plano_id: string;
  valor: number;
  desconto_percent: number;
  ativo: boolean;
}

export function mapNomeLojaToUnidadeSlug(nome: string): string {
  if (!nome) return '';
  const lower = nome.toLowerCase();
  if (lower.includes('itaqua')) return 'ITAQUA';
  if (lower.includes('poá') || lower.includes('poa')) return 'POA';
  if (lower.includes('suzano')) return 'SUZANO';
  return nome;
}

export default function SuperAdmin() {
  const { user, changeUnit } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedUnit } = useUnit();

  const [selectedAdminUnit, setSelectedAdminUnit] = React.useState<string>('MASTER');
  const [openCombobox, setOpenCombobox] = React.useState(false);
  const [searchFranquia, setSearchFranquia] = React.useState('');
  const [quickAccessSearch, setQuickAccessSearch] = React.useState('');
  // Automação: sempre que alguém abrir o painel de Super Admin,
  // sincronizamos automaticamente o status de pagamento das franquias
  React.useEffect(() => {
    const runStatusAutomation = async () => {
      try {
        const { error } = await supabase.functions.invoke('update-franquias-status', {
          body: {},
        });

        if (error) {
          console.error('Falha ao atualizar status de pagamento das franquias', error);
        } else {
          // Atualiza lista de franquias após rodar a automação
          queryClient.invalidateQueries({ queryKey: ['franquias'] });
        }
      } catch (error) {
        console.error('Erro ao chamar automação de status de franquias', error);
      }
    };

    runStatusAutomation();
  }, [queryClient]);

  const [editingFranquia, setEditingFranquia] = React.useState<Franquia | null>(null);
  const [isFranquiaDialogOpen, setIsFranquiaDialogOpen] = React.useState(false);
  const [franquiaForm, setFranquiaForm] = React.useState({
    nome_franquia: '',
    cpf_cnpj: '',
    slug: '',
    plano_limite_lojas: 1,
    status_pagamento: 'ativo',
    data_vencimento: '',
    plano_id: '',
    admin_user_ids: [] as string[],
    modulos_ativos: [] as string[],
    evolution_url: '',
    evolution_instance: '',
    evolution_api_key: '',
  });

  const [editingPlano, setEditingPlano] = React.useState<Plano | null>(null);
  const [isPlanoDialogOpen, setIsPlanoDialogOpen] = React.useState(false);
  const [planoForm, setPlanoForm] = React.useState({
    nome: '',
    tipo: 'mensal' as 'mensal' | 'anual',
    valor_base: '0',
    descricao: '',
    duracao_meses: '1',
    ativo: true,
  });

  const [selectedPlanoUnidade, setSelectedPlanoUnidade] = React.useState({
    unidadeId: '',
    planoId: '',
    valor: '',
    desconto: '',
  });

  const [editingLoja, setEditingLoja] = React.useState<UnidadeResumo | null>(null);
  const [isLojaDialogOpen, setIsLojaDialogOpen] = React.useState(false);
  const [lojaForm, setLojaForm] = React.useState({
    nome_loja: '',
    franquia_id: '',
    user_id: 'none',
  });

  const [isDescontoDialogOpen, setIsDescontoDialogOpen] = React.useState(false);
  const [descontoContext, setDescontoContext] = React.useState<
    'recorrente' | 'pontual' | null
  >(null);
  const [descontoForm, setDescontoForm] = React.useState({
    tipo: 'percentual' as 'percentual' | 'valor',
    valor: '',
  });

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== 'super_admin') {
    return <Navigate to="/" replace />;
  }

  const { data: franquias = [], isLoading: isLoadingFranquias } = useQuery<Franquia[]>({
    queryKey: ['franquias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquias')
        .select(
          'id, nome_franquia, slug, cpf_cnpj, plano_limite_lojas, status_pagamento, config_pagamento, data_vencimento, created_at, desconto_tipo, desconto_valor, desconto_percentual, desconto_recorrente',
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Franquia[];
    },
  });

  const { data: unidades = [] } = useQuery<UnidadeResumo[]>({
    queryKey: ['unidades-resumo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades')
        .select('id, nome_loja, franquia_id');
      if (error) throw error;
      return data as UnidadeResumo[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['system-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_users')
        .select('id, username, unidade_id, franquia_id, role');
      if (error) throw error;
      return data as {
        id: string;
        username: string;
        unidade_id: string | null;
        franquia_id: string | null;
        role: 'admin' | 'user';
      }[];
    },
  });

  const { data: planos = [] } = useQuery<Plano[]>({
    queryKey: ['planos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('id, nome, tipo, valor_base, descricao, duracao_meses, ativo')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Plano[];
    },
  });

  const { data: pacotesComerciais = [] } = useQuery({
    queryKey: ['pacotes-comerciais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pacotes_comerciais')
        .select('id, nome, codigo, preco_total, plano_id')
        .eq('ativo', true)
        .order('preco_total', { ascending: true });
      if (error) throw error;
      return data as { id: string; nome: string; codigo: string; preco_total: number; plano_id: string | null }[];
    },
  });

  const { data: unidadesPlanos = [] } = useQuery<UnidadePlano[]>({
    queryKey: ['unidade-planos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidade_planos')
        .select('id, unidade_id, plano_id, valor, desconto_percent, ativo');
      if (error) throw error;
      return data as UnidadePlano[];
    },
  });

  const { data: modulosGlobais = [] } = useQuery<{
    id: string;
    codigo: string;
    nome: string;
  }[]>({
    queryKey: ['modulos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('id, codigo, nome');
      if (error) throw error;
      return data as any;
    },
  });

  const totalLojas = unidades.length;
  const totalFranquias = franquias.length;
  const totalUsuarios = users.length;

  const filteredFranquias = franquias.filter((f) => {
    if (!searchFranquia.trim()) return true;
    const term = searchFranquia.toLowerCase();
    return (
      f.nome_franquia.toLowerCase().includes(term) ||
      f.slug.toLowerCase().includes(term)
    );
  });

  // Lojas para acesso rápido com busca por nome ou franquia
  const quickAccessUnits = unidades.filter((u) => {
    if (!quickAccessSearch.trim()) return true;
    const term = quickAccessSearch.toLowerCase();
    const franquia = franquias.find((f) => f.id === u.franquia_id);
    return (
      u.nome_loja.toLowerCase().includes(term) ||
      (franquia && franquia.nome_franquia.toLowerCase().includes(term))
    );
  });

  // Financeiro: período e agregações por franquia
  const openNewFranquiaDialog = () => {
    setEditingFranquia(null);
    setFranquiaForm({
      nome_franquia: '',
      cpf_cnpj: '',
      slug: '',
      plano_limite_lojas: 1,
      status_pagamento: 'ativo',
      data_vencimento: '',
      plano_id: '',
      admin_user_ids: [],
      modulos_ativos: [],
      evolution_url: '',
      evolution_instance: '',
      evolution_api_key: '',
      new_user_username: '',
      new_user_password: '',
    });
    setIsFranquiaDialogOpen(true);
  };

  const openEditFranquiaDialog = (franquia: Franquia) => {
    const cfg = (franquia.config_pagamento as any) || {};
    const adminsForFranquia = users.filter(
      (u) => u.franquia_id === franquia.id && u.role === 'admin',
    );
    const whatsapp = cfg.whatsapp || {};
    setEditingFranquia(franquia);
    setFranquiaForm({
      nome_franquia: franquia.nome_franquia,
      cpf_cnpj: (franquia as any).cpf_cnpj || '',
      slug: franquia.slug,
      plano_limite_lojas: franquia.plano_limite_lojas ?? 1,
      status_pagamento: franquia.status_pagamento ?? 'ativo',
      data_vencimento: franquia.data_vencimento || '',
      plano_id: cfg.plano_id || '',
      admin_user_ids: adminsForFranquia.map((u) => u.id),
      modulos_ativos: (cfg.modulos_ativos as string[]) || [],
      evolution_url: whatsapp.url || '',
      evolution_instance: whatsapp.instance || cfg.evolution_instance || '',
      evolution_api_key: whatsapp.api_key || '',
      new_user_username: '',
      new_user_password: '',
    });
    setIsFranquiaDialogOpen(true);
  };

  const openNewLojaForFranquia = (franquiaId: string) => {
    setEditingLoja(null);
    setLojaForm({
      nome_loja: '',
      franquia_id: franquiaId,
      user_id: 'none',
    });
    setIsLojaDialogOpen(true);
  };

  const openEditLojaDialog = (loja: UnidadeResumo) => {
    setEditingLoja(loja);
    // tentar pré-selecionar usuário responsável atual (se houver)
    const currentUserForLoja = users.find((u) => u.unidade_id === loja.id);
    setLojaForm({
      nome_loja: loja.nome_loja,
      franquia_id: loja.franquia_id,
      user_id: currentUserForLoja?.id ?? 'none',
    });
    setIsLojaDialogOpen(true);
  };

  const deleteLoja = async (loja: UnidadeResumo) => {
    if (!confirm(`Excluir a loja "${loja.nome_loja}"?`)) return;

    // Desvincula usuários dessa loja e remove a unidade
    const { error: userError } = await supabase
      .from('system_users')
      .update({ unidade_id: null })
      .eq('unidade_id', loja.id);

    if (userError) {
      toast.error(userError.message);
      return;
    }

    const { error: unidadeError } = await supabase
      .from('unidades')
      .delete()
      .eq('id', loja.id);

    if (unidadeError) {
      toast.error(unidadeError.message);
      return;
    }

    toast.success('Loja excluída com sucesso');
    queryClient.invalidateQueries({ queryKey: ['unidades-resumo'] });
    queryClient.invalidateQueries({ queryKey: ['system-users'] });
  };
  const upsertFranquiaMutation = useMutation({
    mutationFn: async () => {
      const nome = franquiaForm.nome_franquia.trim();
      const slug = (franquiaForm.slug || franquiaForm.nome_franquia)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-');

      if (!nome) {
        throw new Error('Nome da franquia é obrigatório');
      }

      const hasNewUser = franquiaForm.new_user_username?.trim() && franquiaForm.new_user_password?.trim();
      if (franquiaForm.admin_user_ids.length === 0 && !hasNewUser) {
        throw new Error('Selecione pelo menos um usuário administrador ou crie um novo para a franquia');
      }

      const payload = {
        nome_franquia: nome,
        cpf_cnpj: franquiaForm.cpf_cnpj.trim() || null,
        slug,
        plano_limite_lojas: franquiaForm.plano_limite_lojas,
        status_pagamento: franquiaForm.status_pagamento,
        config_pagamento: {
          whatsapp:
            franquiaForm.evolution_url &&
              franquiaForm.evolution_api_key &&
              franquiaForm.evolution_instance
              ? {
                url: franquiaForm.evolution_url,
                api_key: franquiaForm.evolution_api_key,
                instance: franquiaForm.evolution_instance,
              }
              : null,
          plano_id: franquiaForm.plano_id || null,
          modulos_ativos: franquiaForm.modulos_ativos,
        },
        data_vencimento: franquiaForm.data_vencimento || null,
      };

      let franquiaId: string;

      if (editingFranquia) {
        franquiaId = editingFranquia.id;
        const { error } = await supabase
          .from('franquias')
          .update(payload)
          .eq('id', editingFranquia.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('franquias')
          .insert([payload])
          .select('id')
          .single();
        if (error) throw error;
        franquiaId = data.id;
      }

      // Criar novo usuário se preenchido
      let finalAdminIds = [...franquiaForm.admin_user_ids];
      
      if (hasNewUser) {
        // Busca a primeira loja da franquia para vincular ao novo usuário
        const primeiraLoja = unidades.find((u) => u.franquia_id === franquiaId);

        const { data: newUser, error: createError } = await supabase
          .from('system_users')
          .insert([
            {
              username: franquiaForm.new_user_username.trim(),
              password_hash: franquiaForm.new_user_password.trim(),
              role: 'admin',
              franquia_id: franquiaId,
              // Vincula à unidade correta da franquia (não à do admin logado)
              unidade: primeiraLoja?.nome_loja ?? null,
              unidade_id: primeiraLoja?.id ?? null,
            },
          ])
          .select('id')
          .single();
          
        if (createError) throw createError;
        if (newUser) {
          finalAdminIds.push(newUser.id);
        }
      }

      // Garante que os usuários selecionados sejam admins da franquia
      if (finalAdminIds.length > 0) {
        const { error: userError } = await supabase
          .from('system_users')
          .update({ role: 'admin', franquia_id: franquiaId, unidade_id: null })
          .in('id', finalAdminIds);
        if (userError) throw userError;
      }

      // Multi-loja: garante acesso dos admins a todas as lojas da franquia via user_unidades
      const lojasDaFranquia = unidades.filter((u) => u.franquia_id === franquiaId);
      const unidadeIds = lojasDaFranquia.map((u) => u.id);
      if (unidadeIds.length > 0) {
        // Remove vínculos antigos para estes admins nessas lojas
        await supabase
          .from('user_unidades')
          .delete()
          .in('user_id', finalAdminIds)
          .in('unidade_id', unidadeIds);

        // Cria vínculos novos (admin multi-loja)
        const novosVinculos = finalAdminIds.flatMap((userId) =>
          unidadeIds.map((uid) => ({ user_id: userId, unidade_id: uid }))
        );
        if (novosVinculos.length > 0) {
          await supabase.from('user_unidades').insert(novosVinculos);
        }
      }
    },
    onSuccess: () => {
      toast.success('Franquia salva com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setIsFranquiaDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar franquia');
    },
  });

  const renovarFranquiaMutation = useMutation({
    mutationFn: async (franquia: Franquia) => {
      const baseDate = franquia.data_vencimento
        ? new Date(franquia.data_vencimento)
        : new Date();
      const novaData = new Date(baseDate.getTime());
      novaData.setMonth(novaData.getMonth() + 1);

      const { error } = await supabase
        .from('franquias')
        .update({
          status_pagamento: 'ativo',
          data_vencimento: novaData.toISOString().slice(0, 10),
        })
        .eq('id', franquia.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Franquia renovada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao renovar franquia');
    },
  });

  const updateDescontoFranquiaMutation = useMutation({
    mutationFn: async () => {
      if (!editingFranquia || !descontoContext) return;

      const valorNum = Number(descontoForm.valor.replace(',', '.'));
      if (!descontoForm.valor || Number.isNaN(valorNum) || valorNum <= 0) {
        throw new Error('Informe um valor de desconto válido');
      }

      const isPercentual = descontoForm.tipo === 'percentual';

      const updatePayload: any = {
        desconto_tipo: isPercentual ? 'percentual' : 'valor',
        desconto_valor: isPercentual ? 0 : valorNum,
        desconto_percentual: isPercentual ? valorNum : 0,
        desconto_recorrente: descontoContext === 'recorrente',
      };

      const { error } = await supabase
        .from('franquias')
        .update(updatePayload)
        .eq('id', editingFranquia.id);

      if (error) throw error;
      return updatePayload;
    },
    onSuccess: (payload) => {
      if (payload && editingFranquia) {
        setEditingFranquia({
          ...editingFranquia,
          desconto_tipo: payload.desconto_tipo,
          desconto_valor: payload.desconto_valor,
          desconto_percentual: payload.desconto_percentual,
          desconto_recorrente: payload.desconto_recorrente,
        });
      }
      toast.success('Desconto atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      setIsDescontoDialogOpen(false);
      setDescontoContext(null);
      setDescontoForm({ tipo: 'percentual', valor: '' });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar desconto');
    },
  });

  const clearDescontoFranquiaMutation = useMutation({
    mutationFn: async () => {
      if (!editingFranquia) return;
      const updatePayload: any = {
        desconto_tipo: 'nenhum',
        desconto_valor: 0,
        desconto_percentual: 0,
        desconto_recorrente: false,
      };
      const { error } = await supabase
        .from('franquias')
        .update(updatePayload)
        .eq('id', editingFranquia.id);
      if (error) throw error;
      return updatePayload;
    },
    onSuccess: (payload) => {
      if (payload && editingFranquia) {
        setEditingFranquia({
          ...editingFranquia,
          desconto_tipo: payload.desconto_tipo,
          desconto_valor: payload.desconto_valor,
          desconto_percentual: payload.desconto_percentual,
          desconto_recorrente: payload.desconto_recorrente,
        });
      }
      toast.success('Desconto removido com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover desconto');
    },
  });

  const handleToggleFranquiaStatus = async (franquia: Franquia) => {
    const novoStatus = franquia.status_pagamento === 'ativo' ? 'inadimplente' : 'ativo';

    const { error } = await supabase
      .from('franquias')
      .update({ status_pagamento: novoStatus })
      .eq('id', franquia.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      novoStatus === 'ativo'
        ? 'Franquia marcada como ativa'
        : 'Franquia marcada como inadimplente',
    );
    queryClient.invalidateQueries({ queryKey: ['franquias'] });
  };

  const handleDeleteFranquia = async (franquia: Franquia) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a franquia "${franquia.nome_franquia}"? Todas as lojas, usuários e dados vinculados serão removidos.`,
      )
    ) {
      return;
    }

    try {
      // Buscar todas as lojas dessa franquia
      const { data: unidadesDaFranquia, error: unidadesError } = await supabase
        .from('unidades')
        .select('id')
        .eq('franquia_id', franquia.id);

      if (unidadesError) throw unidadesError;

      const unidadeIds = (unidadesDaFranquia || []).map((u) => u.id as string);

      // Remover vínculos de usuários com unidades e franquia
      const { error: userUnidadesError } = await supabase
        .from('user_unidades')
        .delete()
        .in('unidade_id', unidadeIds);
      if (userUnidadesError) throw userUnidadesError;

      const { error: systemUsersError } = await supabase
        .from('system_users')
        .delete()
        .eq('franquia_id', franquia.id);
      if (systemUsersError) throw systemUsersError;

      // Remover planos e bags por unidade
      if (unidadeIds.length > 0) {
        const { error: unidadePlanosError } = await supabase
          .from('unidade_planos')
          .delete()
          .in('unidade_id', unidadeIds);
        if (unidadePlanosError) throw unidadePlanosError;

        const { error: unidadeBagsError } = await supabase
          .from('unidade_bag_tipos')
          .delete()
          .in('unidade_id', unidadeIds);
        if (unidadeBagsError) throw unidadeBagsError;

        const { error: historicoError } = await supabase
          .from('historico_entregas')
          .delete()
          .in('unidade_id', unidadeIds);
        if (historicoError) throw historicoError;

        const { error: entregadoresError } = await supabase
          .from('entregadores')
          .delete()
          .in('unidade_id', unidadeIds);
        if (entregadoresError) throw entregadoresError;

        const { error: unidadesDeleteError } = await supabase
          .from('unidades')
          .delete()
          .in('id', unidadeIds);
        if (unidadesDeleteError) throw unidadesDeleteError;
      }

      // Remover configs de bag e logs da franquia
      const { error: franquiaBagsError } = await supabase
        .from('franquia_bag_tipos')
        .delete()
        .eq('franquia_id', franquia.id);
      if (franquiaBagsError) throw franquiaBagsError;

      const { error: logsError } = await supabase
        .from('logs_auditoria')
        .delete()
        .eq('franquia_id', franquia.id);
      if (logsError) throw logsError;

      // Finalmente, remover a franquia
      const { error: franquiaError } = await supabase
        .from('franquias')
        .delete()
        .eq('id', franquia.id);
      if (franquiaError) throw franquiaError;

      toast.success('Franquia excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      queryClient.invalidateQueries({ queryKey: ['unidades-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['unidade-planos'] });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao excluir franquia');
    }
  };

  const handleFranquiaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertFranquiaMutation.mutate();
  };
  const upsertPlanoMutation = useMutation({
    mutationFn: async () => {
      const nome = planoForm.nome.trim();
      if (!nome) throw new Error('Nome do plano é obrigatório');

      const valor = Number(planoForm.valor_base.replace(',', '.'));
      if (Number.isNaN(valor) || valor <= 0) throw new Error('Valor base inválido');

      const duracao = Number(planoForm.duracao_meses.replace(',', '.'));
      if (Number.isNaN(duracao) || duracao <= 0) throw new Error('Duração em meses inválida');

      const payload = {
        nome,
        tipo: planoForm.tipo,
        valor_base: valor,
        descricao: planoForm.descricao.trim() || null,
        duracao_meses: duracao,
        ativo: planoForm.ativo,
      };

      if (editingPlano) {
        const { error } = await supabase.from('planos').update(payload).eq('id', editingPlano.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('planos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Plano salvo com sucesso');
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      setIsPlanoDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar plano');
    },
  });

  const handleDeletePlano = async (planoId: string) => {
    if (!confirm('Excluir este plano? Ele será removido de todas as lojas.')) return;

    // Remove vínculos com lojas primeiro
    const { error: upError } = await supabase
      .from('unidade_planos')
      .delete()
      .eq('plano_id', planoId);
    if (upError) {
      toast.error(upError.message);
      return;
    }

    const { error } = await supabase.from('planos').delete().eq('id', planoId);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Plano excluído com sucesso');
    queryClient.invalidateQueries({ queryKey: ['planos'] });
    queryClient.invalidateQueries({ queryKey: ['unidade-planos'] });
  };

  const handlePlanoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertPlanoMutation.mutate();
  };

  const upsertUnidadePlanoMutation = useMutation({
    mutationFn: async () => {
      const { unidadeId, planoId, valor, desconto } = selectedPlanoUnidade;
      if (!unidadeId || !planoId) throw new Error('Selecione loja e plano');

      const valorNum = Number(valor.replace(',', '.'));
      const descNum = desconto ? Number(desconto.replace(',', '.')) : 0;
      if (Number.isNaN(valorNum) || valorNum <= 0) throw new Error('Valor inválido');
      if (Number.isNaN(descNum) || descNum < 0) throw new Error('Desconto inválido');

      const existing = unidadesPlanos.find(
        (up) => up.unidade_id === unidadeId && up.plano_id === planoId
      );

      const payload = {
        unidade_id: unidadeId,
        plano_id: planoId,
        valor: valorNum,
        desconto_percent: descNum,
        ativo: true,
      };

      if (existing) {
        const { error } = await supabase
          .from('unidade_planos')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('unidade_planos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Plano aplicado à loja com sucesso');
      queryClient.invalidateQueries({ queryKey: ['unidade-planos'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao aplicar plano');
    },
  });

  return (
    <Layout>
      <div className="space-y-10">
        <header className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/10 shadow-sm">
          <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 space-y-3">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight font-mono text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">Painel Super Admin</h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Gestão central do sistema, franquias, lojas, usuários e financeiro.
            </p>
          </div>
        </header>

        <Tabs defaultValue="geral" className="space-y-8">
          <div className="sticky top-0 z-40 py-2 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <TabsList className="w-full flex flex-wrap gap-2 overflow-x-auto bg-transparent border-0 p-0 sm:w-auto justify-start hide-scrollbar">
              <TabsTrigger value="geral" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Geral</TabsTrigger>
              <TabsTrigger value="franquias" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Franquias</TabsTrigger>
              <TabsTrigger value="lojas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Lojas</TabsTrigger>
              <TabsTrigger value="usuarios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Usuários</TabsTrigger>
              <TabsTrigger value="planos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Planos</TabsTrigger>
              <TabsTrigger value="financeiro" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Financeiro</TabsTrigger>
              <TabsTrigger value="config" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Config</TabsTrigger>
              <TabsTrigger value="dados" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Dados</TabsTrigger>
              <TabsTrigger value="atualizacoes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 shadow-sm transition-all hover:bg-muted">Atualizações</TabsTrigger>
            </TabsList>
          </div>

          {/* Aba Geral */}
          <TabsContent value="geral" className="space-y-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Coluna Principal (2/3) */}
              <div className="space-y-6 lg:col-span-2">
                {/* Acesso rápido */}
                <Card className="border-dashed border-border/70 bg-card/50 backdrop-blur-sm">
                  <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between space-y-0">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-mono flex items-center gap-2">
                        <Store className="w-4 h-4" /> Acesso rápido às lojas
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Escolha entre o painel administrativo master ou entrar em qualquer loja como super admin.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openCombobox}
                            className="w-full sm:w-[400px] justify-between font-normal"
                          >
                            {selectedAdminUnit === 'MASTER'
                              ? 'Painel Administrativo Master'
                              : quickAccessUnits.find((u) => u.nome_loja === selectedAdminUnit)?.nome_loja
                                ? (() => {
                                  const u = quickAccessUnits.find((u) => u.nome_loja === selectedAdminUnit)!;
                                  const f = franquias.find((f) => f.id === u.franquia_id);
                                  return f ? `${f.nome_franquia} / ${u.nome_loja}` : u.nome_loja;
                                })()
                                : 'Selecionar Loja/Franquia...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar loja ou franquia..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                              <CommandGroup heading="Ações">
                                <CommandItem
                                  value="MASTER"
                                  onSelect={() => {
                                    setSelectedAdminUnit('MASTER');
                                    setOpenCombobox(false);
                                  }}
                                  className="font-medium text-primary"
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      selectedAdminUnit === 'MASTER' ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  Painel Administrativo Master
                                </CommandItem>
                              </CommandGroup>
                              <CommandGroup heading="Lojas Disponíveis">
                                {quickAccessUnits.map((u) => {
                                  const franquia = franquias.find((f) => f.id === u.franquia_id);
                                  const label = franquia ? `${franquia.nome_franquia} / ${u.nome_loja}` : u.nome_loja;
                                  return (
                                    <CommandItem
                                      key={u.id}
                                      value={label}
                                      onSelect={() => {
                                        setSelectedAdminUnit(u.nome_loja);
                                        setOpenCombobox(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          selectedAdminUnit === u.nome_loja ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      {label}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedAdminUnit('MASTER');
                            navigate('/admin');
                          }}
                        >
                          Painel master
                        </Button>
                        <Button
                          type="button"
                          disabled={selectedAdminUnit === 'MASTER'}
                          className="bg-primary hover:bg-primary/90"
                          onClick={async () => {
                            if (selectedAdminUnit === 'MASTER') return;
                            
                            // Encontra a unidade completa baseada no nome da loja selecionada (selectedAdminUnit guarda o nome da loja)
                            const unidadeSelecionada = quickAccessUnits.find((u) => u.nome_loja === selectedAdminUnit);
                            
                            if (unidadeSelecionada) {
                              const slug = mapNomeLojaToUnidadeSlug(selectedAdminUnit);
                              // Passa o slug (nome), unidadeId e franquiaId
                              await changeUnit(slug as any, unidadeSelecionada.id, unidadeSelecionada.franquia_id);
                              setSelectedUnit(slug as any);
                              navigate('/roteirista');
                            }
                          }}
                        >
                          Entrar na loja
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Resumo rápido */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Card className="relative overflow-hidden group border-border/50 shadow-md bg-card/60 backdrop-blur-md">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground z-10">Total de Franquias</CardTitle>
                      <Building2 className="w-5 h-5 text-indigo-500 z-10" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-mono font-bold text-foreground drop-shadow-sm">{totalFranquias}</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden group border-border/50 shadow-md bg-card/60 backdrop-blur-md">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground z-10">Total de Lojas</CardTitle>
                      <Store className="w-5 h-5 text-emerald-500 z-10" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-mono font-bold text-foreground drop-shadow-sm">{totalLojas}</p>
                    </CardContent>
                  </Card>
                  <Card className="relative overflow-hidden group border-border/50 shadow-md bg-card/60 backdrop-blur-md">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-violet-500/20 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground z-10">Usuários no Sistema</CardTitle>
                      <Users className="w-5 h-5 text-violet-500 z-10" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-4xl font-mono font-bold text-foreground drop-shadow-sm">{totalUsuarios}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Status do Sistema e Integrações */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-md shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg font-mono flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-500" /> Status do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-background/50 border border-border/50 flex flex-col gap-1">
                        <span className="text-sm font-semibold text-muted-foreground">Banco de Dados</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </span>
                          <span className="font-mono text-sm font-bold">Conectado (Supabase)</span>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-background/50 border border-border/50 flex flex-col gap-1">
                        <span className="text-sm font-semibold text-muted-foreground">Versão do Sistema</span>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="font-mono text-sm font-bold">v2.7.0 (Stable)</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Coluna Lateral (1/3) */}
              <div className="space-y-6">
                {/* Card de Cadastro Rápido */}
                <Card className="border-border/50 bg-gradient-to-br from-primary/10 via-card to-card relative overflow-hidden shadow-xl">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                  <CardHeader>
                    <CardTitle className="text-lg font-mono flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" /> Novo Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      Utilize o fluxo de criação rápida para inicializar uma nova operação de cliente. O assistente criará a <strong>franquia base</strong> necessária para iniciar.
                    </p>
                    <Button 
                      className="w-full gap-2 shadow-lg shadow-primary/20 h-12 rounded-xl text-md font-bold transition-transform hover:scale-[1.02]" 
                      onClick={openNewFranquiaDialog}
                    >
                      <Plus className="w-5 h-5" /> Cadastrar Franquia
                    </Button>
                    <div className="text-xs text-muted-foreground text-center bg-background/50 p-3 rounded-lg border border-border/50">
                      💡 Após criar a franquia, vá até a aba <strong>Usuários</strong> e crie uma conta administrativa vinculando-a à nova franquia.
                    </div>
                  </CardContent>
                </Card>

                {/* Últimas Lojas Cadastradas */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg font-mono flex items-center gap-2">
                      <Store className="w-5 h-5 text-blue-500" /> Últimas Lojas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {quickAccessUnits.slice(0, 5).map((u) => {
                      const franquia = franquias.find((f) => f.id === u.franquia_id);
                      return (
                        <div key={u.id} className="flex items-center justify-between text-sm border-b border-border/30 pb-2 last:border-b-0 last:pb-0">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">{u.nome_loja}</span>
                            <span className="text-xs text-muted-foreground">{franquia ? franquia.nome_franquia : 'Sem Franquia'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">Ativa</span>
                          </div>
                        </div>
                      );
                    })}
                    {quickAccessUnits.length === 0 && (
                      <p className="text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Aba Franquias */}
          <TabsContent value="franquias" className="space-y-4">
            <SuperAdminFranquiasTab
              searchFranquia={searchFranquia}
              setSearchFranquia={setSearchFranquia}
              openNewFranquiaDialog={openNewFranquiaDialog}
              isLoadingFranquias={isLoadingFranquias}
              filteredFranquias={filteredFranquias}
              unidades={unidades}
              renovarFranquiaMutation={renovarFranquiaMutation}
              handleToggleFranquiaStatus={handleToggleFranquiaStatus}
              openEditFranquiaDialog={openEditFranquiaDialog}
              handleDeleteFranquia={handleDeleteFranquia}
            />
          </TabsContent>

          {/* Aba Lojas */}
          <TabsContent value="lojas" className="space-y-4">
            <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
              <Store className="w-5 h-5" /> Todas as lojas por franquia
            </h2>
            {unidades.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma loja cadastrada.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {unidades.map((u) => {
                  const franquia = franquias.find((f) => f.id === u.franquia_id);
                  return (
                    <Card key={u.id} className="border-border">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">{u.nome_loja}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Franquia vinculada:</span>{' '}
                          {franquia ? franquia.nome_franquia : 'Nenhuma'}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Aba Usuários */}
          <TabsContent value="usuarios">
            <UsersManagement />
          </TabsContent>

          {/* Aba Planos / Pacotes */}
          <TabsContent value="planos" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
                <Store className="w-5 h-5" /> Pacotes e planos de assinatura
              </h2>
            </div>

            {/* Configuração centralizada dos 3 pacotes (Básico, Planilha+WhatsApp, Completo) */}
            <PlanosModulosSection />
          </TabsContent>

          {/* Aba Financeiro */}
          <TabsContent value="financeiro" className="space-y-6">
            <SuperAdminFinanceiroTab 
              franquias={franquias} 
              unidades={unidades} 
              planos={planos} 
              unidadesPlanos={unidadesPlanos} 
            />
          </TabsContent>

          {/* Aba Config */}
          <TabsContent value="config" className="space-y-6">
            <BillingGatewayConfigPanel />
          </TabsContent>

          {/* Aba Dados (Export/Import) */}
          <TabsContent value="dados" className="space-y-6">
            <DataExportImport />
          </TabsContent>

          {/* Aba Atualizações do Sistema */}
          <TabsContent value="atualizacoes" className="space-y-6">
            <SuperAdminUpdates />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog de criação/edição de franquia */}
      <Dialog open={isFranquiaDialogOpen} onOpenChange={setIsFranquiaDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingFranquia ? 'Editar franquia' : 'Nova franquia'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFranquiaSubmit} className="space-y-4">
            <Tabs defaultValue="dados">
              <TabsList className="mb-4">
                <TabsTrigger value="dados">Dados da franquia</TabsTrigger>
                <TabsTrigger value="modulos">Módulos</TabsTrigger>
                <TabsTrigger value="integracoes">Integrações</TabsTrigger>
                <TabsTrigger value="lojas" disabled={!editingFranquia}>
                  Lojas da franquia
                </TabsTrigger>
                <TabsTrigger value="bags" disabled={!editingFranquia}>
                  Tipos de BAG
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dados">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da franquia</Label>
                    <Input
                      value={franquiaForm.nome_franquia}
                      onChange={(e) => setFranquiaForm({ ...franquiaForm, nome_franquia: e.target.value })}
                      placeholder="Ex: Dom Fiorentino"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CPF/CNPJ da franquia</Label>
                    <Input
                      value={franquiaForm.cpf_cnpj}
                      onChange={(e) => setFranquiaForm({ ...franquiaForm, cpf_cnpj: e.target.value })}
                      placeholder="Somente números"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={franquiaForm.slug}
                      onChange={(e) => setFranquiaForm({ ...franquiaForm, slug: e.target.value })}
                      placeholder="dom-fiorentino"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Limite de lojas</Label>
                      <Input
                        type="number"
                        min={1}
                        value={franquiaForm.plano_limite_lojas}
                        onChange={(e) =>
                          setFranquiaForm({
                            ...franquiaForm,
                            plano_limite_lojas: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Status pagamento</Label>
                      <Select
                        value={franquiaForm.status_pagamento}
                        onValueChange={(v) => setFranquiaForm({ ...franquiaForm, status_pagamento: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inadimplente">Inadimplente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Data de vencimento</Label>
                    <Input
                      type="date"
                      value={franquiaForm.data_vencimento}
                      onChange={(e) =>
                        setFranquiaForm({
                          ...franquiaForm,
                          data_vencimento: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Plano do cliente</Label>
                      <Select
                        value={franquiaForm.plano_id}
                        onValueChange={(v) =>
                          setFranquiaForm({
                            ...franquiaForm,
                            plano_id: v === '__none__' ? '' : v,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um plano (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sem plano vinculado</SelectItem>
                          {pacotesComerciais.map((p) => (
                            <SelectItem key={p.id} value={p.plano_id || p.id}>
                              {p.nome} (R$ {p.preco_total.toFixed(2)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editingFranquia && (
                    <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
                      <Label className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
                        Descontos
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Gerencie descontos recorrentes ou apenas para a fatura atual desta franquia.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDescontoContext('recorrente');
                            setDescontoForm({ tipo: 'percentual', valor: '' });
                            setIsDescontoDialogOpen(true);
                          }}
                        >
                          Criar desconto recorrente
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDescontoContext('pontual');
                            setDescontoForm({ tipo: 'percentual', valor: '' });
                            setIsDescontoDialogOpen(true);
                          }}
                        >
                          Desconto nesta fatura
                        </Button>
                      </div>

                      {editingFranquia.desconto_tipo &&
                        editingFranquia.desconto_tipo !== 'nenhum' && (
                          <div className="mt-3 flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                            <div className="space-y-1">
                              <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                                Desconto atual
                              </p>
                              <p>
                                {editingFranquia.desconto_tipo === 'percentual'
                                  ? `${Number(editingFranquia.desconto_percentual || 0).toFixed(2)}%`
                                  : `R$ ${Number(editingFranquia.desconto_valor || 0).toFixed(2)}`}{' '}
                                {editingFranquia.desconto_recorrente
                                  ? '• recorrente'
                                  : '• apenas próxima fatura'}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              disabled={clearDescontoFranquiaMutation.isPending}
                              onClick={() => clearDescontoFranquiaMutation.mutate()}
                            >
                              Remover desconto
                            </Button>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Gestão de Usuário Admin */}
                  <div className="space-y-4 pt-4 mt-4 border-t border-border/60">
                    <Label className="text-base font-semibold">Usuário Administrador da Franquia</Label>
                    
                    {!editingFranquia ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border/50">
                          <div className="space-y-1">
                            <Label htmlFor="new_username" className="text-xs font-semibold">Novo Usuário (Login)</Label>
                            <Input
                              id="new_username"
                              value={franquiaForm.new_user_username}
                              onChange={(e) => setFranquiaForm({ ...franquiaForm, new_user_username: e.target.value })}
                              placeholder="Ex: admin_loja"
                              autoComplete="off"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="new_password" className="text-xs font-semibold">Senha</Label>
                            <Input
                              id="new_password"
                              type="password"
                              value={franquiaForm.new_user_password}
                              onChange={(e) => setFranquiaForm({ ...franquiaForm, new_user_password: e.target.value })}
                              placeholder="Senha de acesso"
                              autoComplete="new-password"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-full h-px bg-border/60"></span>
                            <span className="text-xs whitespace-nowrap">Ou vincular existente</span>
                            <span className="w-full h-px bg-border/60"></span>
                          </div>
                          <Select
                            value={franquiaForm.admin_user_ids[0] || ''}
                            onValueChange={(v) =>
                              setFranquiaForm({
                                ...franquiaForm,
                                admin_user_ids: v && v !== 'none' ? [v] : [],
                              })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Selecione caso não vá criar um novo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum (Criarei acima)</SelectItem>
                              {users
                                .filter((u) => !u.franquia_id || u.franquia_id === editingFranquia?.id)
                                .map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.username} ({u.role})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value={franquiaForm.admin_user_ids[0] || ''}
                          onValueChange={(v) =>
                            setFranquiaForm({
                              ...franquiaForm,
                              admin_user_ids: v ? [v] : [],
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o usuário admin principal" />
                          </SelectTrigger>
                          <SelectContent>
                            {users
                              .filter((u) => !u.franquia_id || u.franquia_id === editingFranquia?.id)
                              .map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.username} ({u.role})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Este usuário é o admin da franquia e tem acesso multi-loja.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              </TabsContent>

              <TabsContent value="modulos" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modulosGlobais.map((modulo) => {
                    const isActive = franquiaForm.modulos_ativos.includes(modulo.codigo);
                    return (
                      <div
                        key={modulo.id}
                        className="flex items-center justify-between p-4 border rounded-lg shadow-sm"
                      >
                        <div>
                          <p className="font-semibold text-sm">{modulo.nome}</p>
                          <p className="text-xs text-muted-foreground">{modulo.codigo}</p>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(checked) => {
                            const novosModulos = checked
                              ? [...franquiaForm.modulos_ativos, modulo.codigo]
                              : franquiaForm.modulos_ativos.filter((c) => c !== modulo.codigo);
                            setFranquiaForm({ ...franquiaForm, modulos_ativos: novosModulos });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {modulosGlobais.length === 0 && (
                  <div className="text-center p-4 text-sm text-muted-foreground">
                    Nenhum módulo global encontrado no banco de dados. (Você pode cadastrá-los na tabela `modulos`)
                  </div>
                )}
              </TabsContent>

              <TabsContent value="integracoes" className="space-y-4">
                <div className="space-y-2">
                  <Label>Instância Evolution (opcional)</Label>
                  <Input
                    value={franquiaForm.evolution_instance}
                    onChange={(e) =>
                      setFranquiaForm({ ...franquiaForm, evolution_instance: e.target.value })
                    }
                    placeholder="Identificador da instância Evolution"
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL da Evolution (WhatsApp)</Label>
                  <Input
                    value={franquiaForm.evolution_url}
                    onChange={(e) => setFranquiaForm({ ...franquiaForm, evolution_url: e.target.value })}
                    placeholder="https://evolution-api.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Key da Evolution (WhatsApp)</Label>
                  <Input
                    type="password"
                    value={franquiaForm.evolution_api_key}
                    onChange={(e) =>
                      setFranquiaForm({ ...franquiaForm, evolution_api_key: e.target.value })
                    }
                    placeholder="Chave da API da Evolution"
                  />
                </div>
              </TabsContent>

              <TabsContent value="lojas" className="space-y-4">
                {!editingFranquia ? (
                  <p className="text-sm text-muted-foreground">
                    Salve a franquia primeiro para gerenciar as lojas.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-mono font-semibold">Lojas da franquia</h3>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => openNewLojaForFranquia(editingFranquia.id)}
                      >
                        <Plus className="w-4 h-4" /> Nova loja
                      </Button>
                    </div>

                    {unidades.filter((u) => u.franquia_id === editingFranquia.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma loja vinculada ainda.</p>
                    ) : (
                      <div className="overflow-x-auto border border-border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium">Loja</th>
                              <th className="px-4 py-2 text-left font-medium">Usuário responsável</th>
                              <th className="px-4 py-2 text-right font-medium">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unidades
                              .filter((u) => u.franquia_id === editingFranquia.id)
                              .map((u) => {
                                const responsibleUser = users.find((usr) => usr.unidade_id === u.id);
                                return (
                                  <tr key={u.id} className="border-t border-border/60">
                                    <td className="px-4 py-2">{u.nome_loja}</td>
                                    <td className="px-4 py-2">
                                      {responsibleUser ? responsibleUser.username : 'Nenhum'}
                                    </td>
                                    <td className="px-4 py-2 text-right space-x-2">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => openEditLojaDialog(u)}
                                        title="Editar loja"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => deleteLoja(u)}
                                        title="Excluir loja"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="bags" className="space-y-4">
                {!editingFranquia ? null : <FranquiaBagsSection franquiaId={editingFranquia.id} />}
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 pt-4 mt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsFranquiaDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={upsertFranquiaMutation.isPending}
              >
                {upsertFranquiaMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de criação/edição de plano */}
      <Dialog open={isPlanoDialogOpen} onOpenChange={setIsPlanoDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingPlano ? 'Editar plano' : 'Novo plano'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePlanoSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do plano</Label>
              <Input
                value={planoForm.nome}
                onChange={(e) => setPlanoForm({ ...planoForm, nome: e.target.value })}
                placeholder="Ex: Plano Mensal"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={planoForm.tipo}
                  onValueChange={(v: 'mensal' | 'anual') =>
                    setPlanoForm({ ...planoForm, tipo: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duração (meses)</Label>
                <Input
                  type="number"
                  min={1}
                  value={planoForm.duracao_meses}
                  onChange={(e) =>
                    setPlanoForm({ ...planoForm, duracao_meses: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor base (R$)</Label>
              <Input
                type="text"
                placeholder="Ex: 199,90"
                value={planoForm.valor_base}
                onChange={(e) =>
                  setPlanoForm({ ...planoForm, valor_base: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={planoForm.descricao}
                onChange={(e) =>
                  setPlanoForm({ ...planoForm, descricao: e.target.value })
                }
                placeholder="Detalhes do plano, limitações, etc."
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Plano ativo</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPlanoForm({ ...planoForm, ativo: !planoForm.ativo })}
              >
                {planoForm.ativo ? 'Ativo' : 'Inativo'}
              </Button>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsPlanoDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={upsertPlanoMutation.isPending}
              >
                {upsertPlanoMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Salvar plano
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de criação/edição de loja */}
      <Dialog open={isLojaDialogOpen} onOpenChange={setIsLojaDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingLoja ? 'Editar loja' : 'Nova loja'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const nome = lojaForm.nome_loja.trim();
              if (!nome) {
                toast.error('Nome da loja é obrigatório');
                return;
              }
              if (!lojaForm.franquia_id) {
                toast.error('Selecione uma franquia');
                return;
              }

              // Upsert da loja
              let lojaId = editingLoja?.id;
              const lojaPayload = {
                nome_loja: nome,
                franquia_id: lojaForm.franquia_id,
              };

              if (editingLoja) {
                const { error } = await supabase
                  .from('unidades')
                  .update(lojaPayload)
                  .eq('id', editingLoja.id);
                if (error) {
                  toast.error(error.message);
                  return;
                }
              } else {
                const { data, error } = await supabase
                  .from('unidades')
                  .insert([lojaPayload])
                  .select('id')
                  .maybeSingle();
                if (error) {
                  toast.error(error.message);
                  return;
                }
                lojaId = data?.id;
              }

              // Vincular usuário, se selecionado
              if (lojaForm.user_id && lojaForm.user_id !== 'none' && lojaId) {
                const { error: userError } = await supabase
                  .from('system_users')
                  .update({
                    unidade_id: lojaId,
                    franquia_id: lojaForm.franquia_id,
                  })
                  .eq('id', lojaForm.user_id);

                if (userError) {
                  toast.error(userError.message);
                  return;
                }
              }

              toast.success('Loja salva com sucesso');
              setIsLojaDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['unidades-resumo'] });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Nome da loja</Label>
              <Input
                value={lojaForm.nome_loja}
                onChange={(e) => setLojaForm({ ...lojaForm, nome_loja: e.target.value })}
                placeholder="Ex: Itaquaquecetuba"
              />
            </div>
            <div className="space-y-2">
              <Label>Franquia</Label>
              <Select
                value={lojaForm.franquia_id}
                onValueChange={(v) => setLojaForm({ ...lojaForm, franquia_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a franquia" />
                </SelectTrigger>
                <SelectContent>
                  {franquias.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome_franquia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Usuário responsável (opcional)</Label>
              <Select
                value={lojaForm.user_id}
                onValueChange={(v) => setLojaForm({ ...lojaForm, user_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {users.map((usr) => (
                    <SelectItem key={usr.id} value={usr.id}>
                      {usr.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsLojaDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1">
                Salvar loja
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de desconto da franquia */}
      <Dialog open={isDescontoDialogOpen} onOpenChange={setIsDescontoDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {descontoContext === 'recorrente'
                ? 'Desconto recorrente da franquia'
                : 'Desconto apenas nesta fatura'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateDescontoFranquiaMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Tipo de desconto</Label>
              <Select
                value={descontoForm.tipo}
                onValueChange={(v: 'percentual' | 'valor') =>
                  setDescontoForm({ ...descontoForm, tipo: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="valor">Valor fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {descontoForm.tipo === 'percentual'
                  ? 'Valor do desconto (%)'
                  : 'Valor do desconto (R$)'}
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder={descontoForm.tipo === 'percentual' ? 'Ex: 10' : 'Ex: 50,00'}
                value={descontoForm.valor}
                onChange={(e) =>
                  setDescontoForm({ ...descontoForm, valor: e.target.value })
                }
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsDescontoDialogOpen(false);
                  setDescontoContext(null);
                  setDescontoForm({ tipo: 'percentual', valor: '' });
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={updateDescontoFranquiaMutation.isPending}
              >
                {updateDescontoFranquiaMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar desconto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}



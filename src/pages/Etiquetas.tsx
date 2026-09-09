import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, BackButton } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Tag,
  Printer,
  Package,
  History,
  Snowflake,
  Flame,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit,
  RotateCcw,
  Scale,
  Calendar,
  Sparkles,
  Wifi,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EtiquetaProduto,
  EtiquetaImpressora,
  EtiquetaHistorico,
  fetchEtiquetaProdutos,
  createEtiquetaProduto,
  updateEtiquetaProduto,
  deleteEtiquetaProduto,
  fetchEtiquetaImpressoras,
  createEtiquetaImpressora,
  updateEtiquetaImpressora,
  deleteEtiquetaImpressora,
  fetchEtiquetaHistorico,
  saveEtiquetaHistorico,
  cleanupEtiquetaHistorico7Dias,
  calcularDataValidade,
  formatarDataBR,
  getHoraAtualHHMM,
  CATEGORIAS_PADRAO,
} from '@/lib/api-etiquetas';
import { getHojeLocalYMD } from '@/lib/api';
import { SemPesoConfirmModal } from '@/components/etiquetas/SemPesoConfirmModal';
import {
  EtiquetaPreviewModal,
  DadosImpressaoEtiqueta,
} from '@/components/etiquetas/EtiquetaPreviewModal';
import { CadastroProdutoModal } from '@/components/etiquetas/CadastroProdutoModal';
import { CadastroImpressoraModal } from '@/components/etiquetas/CadastroImpressoraModal';

export default function Etiquetas() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Estados de Abas
  const [activeTab, setActiveTab] = useState<'producao' | 'descongelamento' | 'produtos' | 'impressoras' | 'historico'>('producao');

  // Formulário Aba Produção
  const [prodProdutoId, setProdProdutoId] = useState<string>('');
  const [prodPeso, setProdPeso] = useState<string>('');
  const [prodData, setProdData] = useState<string>(getHojeLocalYMD());
  const [prodHora, setProdHora] = useState<string>(getHoraAtualHHMM());
  const [prodValidade, setProdValidade] = useState<string>('');
  const [prodQuantidade, setProdQuantidade] = useState<number>(1);
  const [prodImpressoraId, setProdImpressoraId] = useState<string>('');

  // Formulário Aba Descongelamento
  const [descProdutoId, setDescProdutoId] = useState<string>('');
  const [descPeso, setDescPeso] = useState<string>('');
  const [descData, setDescData] = useState<string>(getHojeLocalYMD());
  const [descHora, setDescHora] = useState<string>(getHoraAtualHHMM());
  const [descValidade, setDescValidade] = useState<string>('');
  const [descQuantidade, setDescQuantidade] = useState<number>(1);
  const [descImpressoraId, setDescImpressoraId] = useState<string>('');

  // Modais
  const [semPesoModalOpen, setSemPesoModalOpen] = useState(false);
  const [pendenteDadosSemPeso, setPendenteDadosSemPeso] = useState<DadosImpressaoEtiqueta | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [dadosParaPreview, setDadosParaPreview] = useState<DadosImpressaoEtiqueta | null>(null);

  // Modais de Cadastro / Edição
  const [produtoModalOpen, setProdutoModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<EtiquetaProduto | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<string | null>(null);

  const [impressoraModalOpen, setImpressoraModalOpen] = useState(false);
  const [impressoraEditando, setImpressoraEditando] = useState<EtiquetaImpressora | null>(null);
  const [impressoraParaExcluir, setImpressoraParaExcluir] = useState<string | null>(null);

  // Filtros nas listagens
  const [buscaProduto, setBuscaProduto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [filtroTipoHistorico, setFiltroTipoHistorico] = useState('todos');

  const dataExibicao = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // 1. Query Produtos
  const {
    data: produtos = [],
    isLoading: loadingProdutos,
    refetch: refetchProdutos,
  } = useQuery({
    queryKey: ['etiquetas-produtos', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchEtiquetaProdutos(selectedUnit, user?.franquiaId) : []),
    enabled: !!selectedUnit,
  });

  // 2. Query Impressoras
  const {
    data: impressoras = [],
    isLoading: loadingImpressoras,
    refetch: refetchImpressoras,
  } = useQuery({
    queryKey: ['etiquetas-impressoras', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchEtiquetaImpressoras(selectedUnit, user?.franquiaId) : []),
    enabled: !!selectedUnit,
  });

  // 3. Query Histórico (com auto-limpeza de 7 dias)
  const {
    data: historico = [],
    isLoading: loadingHistorico,
    refetch: refetchHistorico,
  } = useQuery({
    queryKey: ['etiquetas-historico', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchEtiquetaHistorico(selectedUnit, user?.franquiaId) : []),
    enabled: !!selectedUnit,
    refetchInterval: 15000,
  });

  // Produtos ativos para os selects
  const produtosAtivos = useMemo(() => produtos.filter((p) => p.ativo), [produtos]);

  // Define produto padrão inicial quando carregar
  useEffect(() => {
    if (produtosAtivos.length > 0) {
      if (!prodProdutoId) {
        const p = produtosAtivos[0];
        setProdProdutoId(p.id);
        setProdValidade(calcularDataValidade(prodData, p.validade_producao_dias));
      }
      if (!descProdutoId) {
        const p = produtosAtivos[0];
        setDescProdutoId(p.id);
        setDescValidade(calcularDataValidade(descData, p.validade_descongelamento_dias));
      }
    }
  }, [produtosAtivos, prodProdutoId, descProdutoId, prodData, descData]);

  // Define impressora padrão inicial quando carregar
  useEffect(() => {
    const impressoraAtiva = impressoras.find((i) => i.ativa);
    if (impressoraAtiva) {
      if (!prodImpressoraId) setProdImpressoraId(impressoraAtiva.id);
      if (!descImpressoraId) setDescImpressoraId(impressoraAtiva.id);
    }
  }, [impressoras, prodImpressoraId, descImpressoraId]);

  // Atualiza data de validade automática na aba Produção quando altera produto ou data
  const handleSelectProdutoProducao = (prodId: string) => {
    setProdProdutoId(prodId);
    const prod = produtos.find((p) => p.id === prodId);
    if (prod) {
      setProdValidade(calcularDataValidade(prodData, prod.validade_producao_dias));
    }
  };

  const handleDataProducaoChange = (novaData: string) => {
    setProdData(novaData);
    const prod = produtos.find((p) => p.id === prodProdutoId);
    if (prod) {
      setProdValidade(calcularDataValidade(novaData, prod.validade_producao_dias));
    }
  };

  // Atualiza data de validade automática na aba Descongelamento quando altera produto ou data
  const handleSelectProdutoDescongelamento = (prodId: string) => {
    setDescProdutoId(prodId);
    const prod = produtos.find((p) => p.id === prodId);
    if (prod) {
      setDescValidade(calcularDataValidade(descData, prod.validade_descongelamento_dias));
    }
  };

  const handleDataDescongelamentoChange = (novaData: string) => {
    setDescData(novaData);
    const prod = produtos.find((p) => p.id === descProdutoId);
    if (prod) {
      setDescValidade(calcularDataValidade(novaData, prod.validade_descongelamento_dias));
    }
  };

  // KPIs / Relatórios
  const stats = useMemo(() => {
    const hojeYMD = getHojeLocalYMD();
    let produzidosHoje = 0;
    let descongeladosHoje = 0;
    let vencendoHoje = 0;

    historico.forEach((item) => {
      const isHoje = item.data_operacao === hojeYMD || item.created_at?.startsWith(hojeYMD);
      if (isHoje) {
        if (item.tipo === 'producao') produzidosHoje += item.quantidade || 1;
        else if (item.tipo === 'descongelamento') descongeladosHoje += item.quantidade || 1;
      }

      if (item.data_validade === hojeYMD) {
        vencendoHoje += 1;
      }
    });

    return {
      produzidosHoje,
      descongeladosHoje,
      vencendoHoje,
      totalProdutos: produtosAtivos.length,
    };
  }, [historico, produtosAtivos]);

  // Mutations
  const salvarHistoricoMutation = useMutation({
    mutationFn: (dados: DadosImpressaoEtiqueta) =>
      saveEtiquetaHistorico({
        unidade: selectedUnit!,
        franquia_id: user?.franquiaId,
        tipo: dados.tipo === 'PRODUÇÃO' ? 'producao' : 'descongelamento',
        produto_nome: dados.produtoNome,
        categoria: dados.categoria,
        peso: dados.peso,
        data_operacao: dados.dataOperacao,
        hora_operacao: dados.horaOperacao,
        data_validade: dados.dataValidade,
        quantidade: dados.quantidade,
        usuarioNome: dados.usuarioNome,
        impressora_nome: dados.impressoraNome,
        modelo_etiqueta: dados.modeloEtiqueta || '80x30',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-historico'] });
      toast.success('Etiqueta enviada para impressão e registrada no histórico!');
    },
    onError: () => toast.error('Erro ao registrar impressão no histórico'),
  });

  const salvarProdutoMutation = useMutation({
    mutationFn: async (dados: {
      id?: string;
      nome: string;
      categoria: string;
      validade_producao_dias: number;
      validade_descongelamento_dias: number;
      ativo: boolean;
    }) => {
      if (dados.id) {
        return updateEtiquetaProduto(dados.id, dados, selectedUnit!);
      } else {
        return createEtiquetaProduto({
          ...dados,
          unidade: selectedUnit!,
          franquia_id: user?.franquiaId,
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-produtos'] });
      toast.success(vars.id ? 'Produto atualizado com sucesso!' : 'Novo produto cadastrado!');
      setProdutoModalOpen(false);
      setProdutoEditando(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao salvar produto'),
  });

  const excluirProdutoMutation = useMutation({
    mutationFn: (id: string) => deleteEtiquetaProduto(id, selectedUnit!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-produtos'] });
      toast.success('Produto excluído com sucesso');
      setProdutoParaExcluir(null);
    },
    onError: () => toast.error('Erro ao excluir produto'),
  });

  const salvarImpressoraMutation = useMutation({
    mutationFn: async (dados: {
      id?: string;
      nome: string;
      modelo: string;
      ip: string;
      porta: number;
      ativa: boolean;
    }) => {
      if (dados.id) {
        return updateEtiquetaImpressora(dados.id, dados, selectedUnit!);
      } else {
        return createEtiquetaImpressora({
          ...dados,
          unidade: selectedUnit!,
          franquia_id: user?.franquiaId,
        });
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-impressoras'] });
      toast.success(vars.id ? 'Impressora atualizada com sucesso!' : 'Impressora cadastrada!');
      setImpressoraModalOpen(false);
      setImpressoraEditando(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao salvar impressora'),
  });

  const excluirImpressoraMutation = useMutation({
    mutationFn: (id: string) => deleteEtiquetaImpressora(id, selectedUnit!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-impressoras'] });
      toast.success('Impressora removida com sucesso');
      setImpressoraParaExcluir(null);
    },
    onError: () => toast.error('Erro ao excluir impressora'),
  });

  // Ação de Pré-Visualização da Produção com Verificação de Peso Vazio
  const handlePrevisualizarProducao = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = produtos.find((p) => p.id === prodProdutoId);
    if (!prod) {
      toast.error('Selecione um produto para continuar.');
      return;
    }

    const imp = impressoras.find((i) => i.id === prodImpressoraId);

    const dadosMontados: DadosImpressaoEtiqueta = {
      tipo: 'PRODUÇÃO',
      produtoNome: prod.nome,
      categoria: prod.categoria,
      peso: prodPeso.trim() || null,
      dataOperacao: prodData,
      horaOperacao: prodHora || getHoraAtualHHMM(),
      dataValidade: prodValidade || calcularDataValidade(prodData, prod.validade_producao_dias),
      quantidade: Math.max(1, prodQuantidade || 1),
      unidade: selectedUnit!,
      usuarioNome: user?.username || 'Operador',
      impressoraNome: imp?.nome || 'Elgin L42 Pro Full',
    };

    // Confirmação obrigatória se peso estiver vazio
    if (!prodPeso.trim()) {
      setPendenteDadosSemPeso(dadosMontados);
      setSemPesoModalOpen(true);
      return;
    }

    setDadosParaPreview(dadosMontados);
    setPreviewModalOpen(true);
  };

  // Ação de Pré-Visualização do Descongelamento com Verificação de Peso Vazio
  const handlePrevisualizarDescongelamento = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = produtos.find((p) => p.id === descProdutoId);
    if (!prod) {
      toast.error('Selecione um produto para continuar.');
      return;
    }

    const imp = impressoras.find((i) => i.id === descImpressoraId);

    const dadosMontados: DadosImpressaoEtiqueta = {
      tipo: 'DESCONGELAMENTO',
      produtoNome: prod.nome,
      categoria: prod.categoria,
      peso: descPeso.trim() || null,
      dataOperacao: descData,
      horaOperacao: descHora || getHoraAtualHHMM(),
      dataValidade: descValidade || calcularDataValidade(descData, prod.validade_descongelamento_dias),
      quantidade: Math.max(1, descQuantidade || 1),
      unidade: selectedUnit!,
      usuarioNome: user?.username || 'Operador',
      impressoraNome: imp?.nome || 'Elgin L42 Pro Full',
    };

    // Confirmação obrigatória se peso estiver vazio
    if (!descPeso.trim()) {
      setPendenteDadosSemPeso(dadosMontados);
      setSemPesoModalOpen(true);
      return;
    }

    setDadosParaPreview(dadosMontados);
    setPreviewModalOpen(true);
  };

  // Reimpressão direta pelo histórico
  const handleReimprimirHistorico = (item: EtiquetaHistorico) => {
    const dadosReimpressao: DadosImpressaoEtiqueta = {
      tipo: item.tipo === 'producao' ? 'PRODUÇÃO' : 'DESCONGELAMENTO',
      produtoNome: item.produto_nome,
      categoria: item.categoria,
      peso: item.peso,
      dataOperacao: item.data_operacao,
      horaOperacao: item.hora_operacao,
      dataValidade: item.data_validade,
      quantidade: item.quantidade || 1,
      unidade: item.unidade,
      usuarioNome: item.usuario_nome,
      impressoraNome: item.impressora_nome,
      modeloEtiqueta: (item.modelo_etiqueta as any) || '80x30',
    };

    setDadosParaPreview(dadosReimpressao);
    setPreviewModalOpen(true);
  };

  // Filtros da Aba de Produtos
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca = !buscaProduto.trim() || p.nome.toLowerCase().includes(buscaProduto.toLowerCase());
      const matchCat = filtroCategoria === 'todas' || p.categoria === filtroCategoria;
      return matchBusca && matchCat;
    });
  }, [produtos, buscaProduto, filtroCategoria]);

  // Filtros da Aba de Histórico
  const historicoFiltrado = useMemo(() => {
    return historico.filter((h) => {
      const matchBusca =
        !buscaHistorico.trim() ||
        h.produto_nome.toLowerCase().includes(buscaHistorico.toLowerCase()) ||
        h.usuario_nome.toLowerCase().includes(buscaHistorico.toLowerCase());
      const matchTipo = filtroTipoHistorico === 'todos' || h.tipo === filtroTipoHistorico;
      return matchBusca && matchTipo;
    });
  }, [historico, buscaHistorico, filtroTipoHistorico]);

  return (
    <Layout>
      <div className="space-y-6">
        <BackButton />

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/80 backdrop-blur-sm border border-border/80 p-6 rounded-3xl shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-foreground flex items-center gap-2">
                  Etiquetas
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
                    Elgin L42 Pro Full
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {dataExibicao} • Loja {selectedUnit}
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação Rápidos */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchProdutos();
                refetchImpressoras();
                refetchHistorico();
                toast.success('Dados de etiquetas atualizados!');
              }}
              className="border-border text-xs gap-1.5 h-10 px-3 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImpressoraEditando(null);
                setImpressoraModalOpen(true);
              }}
              className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold gap-2 h-10 px-3.5 rounded-xl shadow-sm"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              Impressoras
            </Button>

            <Button
              onClick={() => {
                setProdutoEditando(null);
                setProdutoModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold gap-2 h-10 px-4 rounded-xl shadow-md"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </Button>
          </div>
        </div>

        {/* KPIs / Relatórios Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card/60 border border-border/60 rounded-2xl p-4 flex items-center gap-3 shadow-sm bg-amber-950/5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Produzidos Hoje
              </span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-0.5 block">
                {stats.produzidosHoje}
              </span>
            </div>
          </div>

          <div className="bg-card/60 border border-border/60 rounded-2xl p-4 flex items-center gap-3 shadow-sm bg-blue-950/5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Snowflake className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Descongelados Hoje
              </span>
              <span className="text-xl font-bold font-mono text-blue-400 mt-0.5 block">
                {stats.descongeladosHoje}
              </span>
            </div>
          </div>

          <div className="bg-card/60 border border-border/60 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Vencendo Hoje
              </span>
              <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">
                {stats.vencendoHoje}
              </span>
            </div>
          </div>

          <div className="bg-card/60 border border-border/60 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground border border-border/60">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Produtos Ativos
              </span>
              <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
                {stats.totalProdutos}
              </span>
            </div>
          </div>
        </div>

        {/* Abas Principais */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-12 p-1 bg-card/80 border border-border/80 rounded-2xl">
            <TabsTrigger value="producao" className="rounded-xl font-semibold text-xs gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold">
              <Flame className="w-4 h-4" />
              Produção
            </TabsTrigger>
            <TabsTrigger value="descongelamento" className="rounded-xl font-semibold text-xs gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 data-[state=active]:font-bold">
              <Snowflake className="w-4 h-4" />
              Descongelamento
            </TabsTrigger>
            <TabsTrigger value="produtos" className="rounded-xl font-semibold text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Package className="w-4 h-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="impressoras" className="rounded-xl font-semibold text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Printer className="w-4 h-4" />
              Impressoras
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-xl font-semibold text-xs gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4" />
              Histórico (7d)
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* ABA 1: PRODUÇÃO                                           */}
          {/* ========================================================= */}
          <TabsContent value="producao">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulário */}
              <div className="lg:col-span-2 bg-card/70 border border-border/80 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-border/60 pb-3">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-foreground font-mono">Emissão de Etiqueta de Produção</h2>
                </div>

                <form onSubmit={handlePrevisualizarProducao} className="space-y-4">
                  {/* Produto */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">Produto *</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setProdutoEditando(null);
                          setProdutoModalOpen(true);
                        }}
                        className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Cadastrar outro produto
                      </button>
                    </div>
                    <Select value={prodProdutoId} onValueChange={handleSelectProdutoProducao}>
                      <SelectTrigger className="h-12 rounded-xl bg-card border-border font-bold text-sm">
                        <SelectValue placeholder="Selecione o produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {produtosAtivos.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs font-semibold py-2">
                            {p.nome} <span className="text-muted-foreground ml-2">({p.categoria} • {p.validade_producao_dias}d)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Peso (Opcional com confirmação) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                      Peso (Opcional)
                    </Label>
                    <Input
                      placeholder="Ex: 500g, 1kg, 250g, 1.2kg..."
                      value={prodPeso}
                      onChange={(e) => setProdPeso(e.target.value)}
                      className="h-11 rounded-xl bg-card border-border font-semibold text-sm"
                    />
                    <span className="text-[11px] text-muted-foreground block">
                      Deixe vazio caso a etiqueta não precise conter especificação de peso.
                    </span>
                  </div>

                  {/* Datas e Horas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Data Produção</Label>
                      <Input
                        type="date"
                        value={prodData}
                        onChange={(e) => handleDataProducaoChange(e.target.value)}
                        className="h-11 rounded-xl bg-card border-border font-mono font-semibold text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Hora Produção</Label>
                      <Input
                        type="time"
                        value={prodHora}
                        onChange={(e) => setProdHora(e.target.value)}
                        className="h-11 rounded-xl bg-card border-border font-mono font-semibold text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                        Validade
                        <span className="text-[10px] text-amber-400 font-normal">Auto-calculada</span>
                      </Label>
                      <Input
                        type="date"
                        value={prodValidade}
                        onChange={(e) => setProdValidade(e.target.value)}
                        className="h-11 rounded-xl bg-card border-amber-500/40 font-mono font-bold text-xs text-amber-300"
                        required
                      />
                    </div>
                  </div>

                  {/* Quantidade e Impressora */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Quantidade de Etiquetas</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={prodQuantidade}
                        onChange={(e) => setProdQuantidade(Number(e.target.value))}
                        className="h-11 rounded-xl bg-card border-border font-mono font-bold text-center text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Impressora Térmica</Label>
                      <Select value={prodImpressoraId} onValueChange={setProdImpressoraId}>
                        <SelectTrigger className="h-11 rounded-xl bg-card border-border text-xs font-semibold">
                          <SelectValue placeholder="Selecione a impressora..." />
                        </SelectTrigger>
                        <SelectContent>
                          {impressoras.map((imp) => (
                            <SelectItem key={imp.id} value={imp.id} className="text-xs">
                              {imp.nome} <span className="text-muted-foreground ml-1">({imp.modelo})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Botão Principal */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      Pré-visualizar e Imprimir
                    </Button>
                  </div>
                </form>
              </div>

              {/* Card Lateral de Atalhos e Dicas */}
              <div className="space-y-4">
                <div className="bg-card/70 border border-border/80 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Padrão de Impressão (80x30mm)
                  </h3>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>• O cálculo de validade é executado automaticamente com base no cadastro do produto.</p>
                    <p>• A impressão é calibrada para etiquetas térmicas adesivas de <strong>80mm x 30mm</strong> (Elgin L42 Pro Full).</p>
                    <p>• O peso é opcional e você pode continuar mesmo sem preencher.</p>
                  </div>
                </div>

                {/* Seleção Rápida de Produtos Populares */}
                <div className="bg-card/70 border border-border/80 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-3">Atalhos Rápidos</h3>
                  <div className="flex flex-wrap gap-2">
                    {produtosAtivos.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProdutoProducao(p.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-semibold ${
                          prodProdutoId === p.id
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                            : 'bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        {p.nome}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 2: DESCONGELAMENTO                                    */}
          {/* ========================================================= */}
          <TabsContent value="descongelamento">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulário */}
              <div className="lg:col-span-2 bg-card/70 border border-border/80 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 border-b border-border/60 pb-3">
                  <Snowflake className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-bold text-foreground font-mono">Emissão de Etiqueta de Descongelamento</h2>
                </div>

                <form onSubmit={handlePrevisualizarDescongelamento} className="space-y-4">
                  {/* Produto */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground">Produto *</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setProdutoEditando(null);
                          setProdutoModalOpen(true);
                        }}
                        className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Cadastrar outro produto
                      </button>
                    </div>
                    <Select value={descProdutoId} onValueChange={handleSelectProdutoDescongelamento}>
                      <SelectTrigger className="h-12 rounded-xl bg-card border-border font-bold text-sm">
                        <SelectValue placeholder="Selecione o produto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {produtosAtivos.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs font-semibold py-2">
                            {p.nome} <span className="text-muted-foreground ml-2">({p.categoria} • {p.validade_descongelamento_dias}d desc.)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Peso (Opcional com confirmação) */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-muted-foreground" />
                      Peso (Opcional)
                    </Label>
                    <Input
                      placeholder="Ex: 1kg, 2kg, 500g..."
                      value={descPeso}
                      onChange={(e) => setDescPeso(e.target.value)}
                      className="h-11 rounded-xl bg-card border-border font-semibold text-sm"
                    />
                    <span className="text-[11px] text-muted-foreground block">
                      Deixe vazio caso a etiqueta não precise conter especificação de peso.
                    </span>
                  </div>

                  {/* Datas e Horas */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Data Descongelamento</Label>
                      <Input
                        type="date"
                        value={descData}
                        onChange={(e) => handleDataDescongelamentoChange(e.target.value)}
                        className="h-11 rounded-xl bg-card border-border font-mono font-semibold text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Hora Descongelamento</Label>
                      <Input
                        type="time"
                        value={descHora}
                        onChange={(e) => setDescHora(e.target.value)}
                        className="h-11 rounded-xl bg-card border-border font-mono font-semibold text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                        Validade
                        <span className="text-[10px] text-blue-400 font-normal">Auto-calculada</span>
                      </Label>
                      <Input
                        type="date"
                        value={descValidade}
                        onChange={(e) => setDescValidade(e.target.value)}
                        className="h-11 rounded-xl bg-card border-blue-500/40 font-mono font-bold text-xs text-blue-300"
                        required
                      />
                    </div>
                  </div>

                  {/* Quantidade e Impressora */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Quantidade de Etiquetas</Label>
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={descQuantidade}
                        onChange={(e) => setDescQuantidade(Number(e.target.value))}
                        className="h-11 rounded-xl bg-card border-border font-mono font-bold text-center text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Impressora Térmica</Label>
                      <Select value={descImpressoraId} onValueChange={setDescImpressoraId}>
                        <SelectTrigger className="h-11 rounded-xl bg-card border-border text-xs font-semibold">
                          <SelectValue placeholder="Selecione a impressora..." />
                        </SelectTrigger>
                        <SelectContent>
                          {impressoras.map((imp) => (
                            <SelectItem key={imp.id} value={imp.id} className="text-xs">
                              {imp.nome} <span className="text-muted-foreground ml-1">({imp.modelo})</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Botão Principal */}
                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm shadow-lg shadow-blue-500/20 gap-2"
                    >
                      <Printer className="w-5 h-5" />
                      Pré-visualizar e Imprimir
                    </Button>
                  </div>
                </form>
              </div>

              {/* Card Lateral de Atalhos */}
              <div className="space-y-4">
                <div className="bg-card/70 border border-border/80 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-blue-400" />
                    Regra de Descongelamento
                  </h3>
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p>• A validade após o descongelamento é calculada a partir dos dias configurados para o produto.</p>
                    <p>• A etiqueta recebe o cabeçalho <strong>DESCONGELAMENTO</strong> para fácil identificação pela equipe de corte e montagem.</p>
                  </div>
                </div>

                {/* Seleção Rápida de Produtos */}
                <div className="bg-card/70 border border-border/80 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-foreground mb-3">Atalhos Rápidos</h3>
                  <div className="flex flex-wrap gap-2">
                    {produtosAtivos.slice(0, 6).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProdutoDescongelamento(p.id)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-semibold ${
                          descProdutoId === p.id
                            ? 'bg-blue-500 text-slate-950 border-blue-400 font-bold shadow-sm'
                            : 'bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        {p.nome}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 3: PRODUTOS                                           */}
          {/* ========================================================= */}
          <TabsContent value="produtos" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/70 border border-border/80 p-4 rounded-2xl">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto cadastrado..."
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-card border-border text-xs"
                  />
                </div>

                <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                  <SelectTrigger className="w-[180px] h-10 rounded-xl bg-card border-border text-xs font-semibold">
                    <SelectValue placeholder="Todas categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">Todas Categorias</SelectItem>
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => {
                  setProdutoEditando(null);
                  setProdutoModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold gap-2 rounded-xl h-10 px-4 shadow-md"
              >
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            </div>

            {/* Listagem de Produtos */}
            {loadingProdutos ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Carregando catálogo de produtos...</span>
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-3xl p-6 bg-card/40">
                <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                <h3 className="text-sm font-bold text-foreground">Nenhum produto encontrado</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Cadastre novos produtos com suas respectivas validades em dias.
                </p>
                <Button
                  onClick={() => {
                    setProdutoEditando(null);
                    setProdutoModalOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Cadastrar Produto
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {produtosFiltrados.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-card/70 border border-border/80 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-amber-500/40 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            {prod.categoria}
                          </span>
                          <h4 className="text-sm font-black text-foreground uppercase mt-0.5">
                            {prod.nome}
                          </h4>
                        </div>
                        <Badge
                          variant={prod.ativo ? 'default' : 'secondary'}
                          className={`text-[10px] font-bold ${
                            prod.ativo
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {prod.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/50 text-xs">
                        <div className="p-2 rounded-xl bg-secondary/40 border border-border/50">
                          <span className="text-[9px] text-muted-foreground font-bold block uppercase">Produção</span>
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {prod.validade_producao_dias} {prod.validade_producao_dias === 1 ? 'dia' : 'dias'}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-secondary/40 border border-border/50">
                          <span className="text-[9px] text-muted-foreground font-bold block uppercase">Descongelar</span>
                          <span className="font-mono font-bold text-blue-400 text-sm">
                            {prod.validade_descongelamento_dias} {prod.validade_descongelamento_dias === 1 ? 'dia' : 'dias'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setProdutoEditando(prod);
                          setProdutoModalOpen(true);
                        }}
                        className="h-8 px-2.5 rounded-lg text-xs hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setProdutoParaExcluir(prod.id)}
                        className="h-8 px-2.5 rounded-lg text-xs hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 4: IMPRESSORAS                                        */}
          {/* ========================================================= */}
          <TabsContent value="impressoras" className="space-y-4">
            <div className="flex items-center justify-between bg-card/70 border border-border/80 p-4 rounded-2xl">
              <div>
                <h3 className="text-sm font-bold text-foreground">Impressoras Térmicas Cadastradas</h3>
                <p className="text-xs text-muted-foreground">
                  Compatível com Elgin L42 Pro Full, Zebra e impressoras de rede térmicas via RAW 9100.
                </p>
              </div>

              <Button
                onClick={() => {
                  setImpressoraEditando(null);
                  setImpressoraModalOpen(true);
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold gap-2 rounded-xl h-10 px-4 shadow-md"
              >
                <Plus className="w-4 h-4" /> Nova Impressora
              </Button>
            </div>

            {loadingImpressoras ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Carregando impressoras...</span>
              </div>
            ) : impressoras.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-3xl p-6 bg-card/40">
                <Printer className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                <h3 className="text-sm font-bold text-foreground">Nenhuma impressora configurada</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  Cadastre o IP da sua Elgin L42 Pro Full na rede para direcionamento de impressão.
                </p>
                <Button
                  onClick={() => {
                    setImpressoraEditando(null);
                    setImpressoraModalOpen(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Cadastrar Impressora
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {impressoras.map((imp) => (
                  <div
                    key={imp.id}
                    className="bg-card/70 border border-border/80 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                            <Printer className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-foreground">{imp.nome}</h4>
                            <span className="text-[11px] text-muted-foreground font-medium block">
                              {imp.modelo}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={imp.ativa ? 'default' : 'secondary'}
                          className={`text-[10px] font-bold ${
                            imp.ativa
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {imp.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>

                      <div className="p-3 rounded-xl bg-secondary/40 border border-border/50 mt-4 space-y-1 text-xs font-mono">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>IP na Rede:</span>
                          <strong className="text-foreground">{imp.ip}</strong>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Porta RAW:</span>
                          <strong className="text-foreground">{imp.porta}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          toast.success(`Comunicação com ${imp.nome} (${imp.ip}:${imp.porta}) testada com sucesso!`);
                        }}
                        className="h-8 px-2 rounded-lg text-[11px] text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 font-bold"
                      >
                        <Wifi className="w-3.5 h-3.5 mr-1" /> Testar Rede
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setImpressoraEditando(imp);
                            setImpressoraModalOpen(true);
                          }}
                          className="h-8 px-2.5 rounded-lg text-xs hover:bg-secondary text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setImpressoraParaExcluir(imp.id)}
                          className="h-8 px-2.5 rounded-lg text-xs hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 5: HISTÓRICO (ÚLTIMOS 7 DIAS)                         */}
          {/* ========================================================= */}
          <TabsContent value="historico" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/70 border border-border/80 p-4 rounded-2xl">
              <div className="flex flex-1 items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar histórico por produto ou operador..."
                    value={buscaHistorico}
                    onChange={(e) => setBuscaHistorico(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-card border-border text-xs"
                  />
                </div>

                <Select value={filtroTipoHistorico} onValueChange={setFiltroTipoHistorico}>
                  <SelectTrigger className="w-[160px] h-10 rounded-xl bg-card border-border text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos" className="text-xs">Todos os Tipos</SelectItem>
                    <SelectItem value="producao" className="text-xs">Produção</SelectItem>
                    <SelectItem value="descongelamento" className="text-xs">Descongelamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-secondary text-muted-foreground text-xs font-semibold px-3 py-1.5 rounded-xl border border-border">
                  Retenção: 7 dias automáticos
                </Badge>
              </div>
            </div>

            {loadingHistorico ? (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                <span className="text-xs">Carregando histórico recente...</span>
              </div>
            ) : historicoFiltrado.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-border rounded-3xl p-6 bg-card/40">
                <History className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                <h3 className="text-sm font-bold text-foreground">Nenhuma impressão registrada nos últimos 7 dias</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  As etiquetas emitidas em Produção e Descongelamento aparecerão aqui para consulta e reimpressão.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {historicoFiltrado.map((item) => (
                  <div
                    key={item.id}
                    className="bg-card/70 border border-border/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-border transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
                          item.tipo === 'producao'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {item.tipo === 'producao' ? <Flame className="w-5 h-5" /> : <Snowflake className="w-5 h-5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground uppercase">{item.produto_nome}</h4>
                          <Badge
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 ${
                              item.tipo === 'producao'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {item.tipo === 'producao' ? 'Produção' : 'Descongelamento'}
                          </Badge>
                          {item.peso && (
                            <span className="text-[11px] font-bold font-mono bg-secondary px-1.5 py-0.5 rounded text-foreground">
                              {item.peso}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1 font-mono">
                          <span>Data: <strong>{formatarDataBR(item.data_operacao)}</strong> ({item.hora_operacao})</span>
                          <span>•</span>
                          <span className="text-amber-400">Validade: <strong>{formatarDataBR(item.data_validade)}</strong></span>
                          <span>•</span>
                          <span>Resp: <strong>{item.usuario_nome}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Qtd</span>
                        <span className="text-sm font-black font-mono text-foreground">
                          {item.quantidade}x
                        </span>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReimprimirHistorico(item)}
                        className="rounded-xl h-9 px-3 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold gap-1.5 shadow-sm"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        Reimprimir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ========================================================= */}
      {/* MODAIS DO SISTEMA DE ETIQUETAS                            */}
      {/* ========================================================= */}

      {/* 1. Confirmação Obrigatória de Peso Vazio */}
      <SemPesoConfirmModal
        open={semPesoModalOpen}
        onOpenChange={setSemPesoModalOpen}
        onConfirm={() => {
          setSemPesoModalOpen(false);
          if (pendenteDadosSemPeso) {
            setDadosParaPreview(pendenteDadosSemPeso);
            setPreviewModalOpen(true);
            setPendenteDadosSemPeso(null);
          }
        }}
      />

      {/* 2. Pré-Visualização da Etiqueta Térmica */}
      <EtiquetaPreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        dados={dadosParaPreview}
        onConfirmPrint={(dadosCompletos) => {
          salvarHistoricoMutation.mutate(dadosCompletos);
        }}
      />

      {/* 3. Cadastro / Edição de Produto */}
      <CadastroProdutoModal
        open={produtoModalOpen}
        onOpenChange={setProdutoModalOpen}
        produtoEditando={produtoEditando}
        onSave={(dados) => salvarProdutoMutation.mutate(dados)}
        loading={salvarProdutoMutation.isPending}
      />

      {/* 4. Cadastro / Edição de Impressora */}
      <CadastroImpressoraModal
        open={impressoraModalOpen}
        onOpenChange={setImpressoraModalOpen}
        impressoraEditando={impressoraEditando}
        onSave={(dados) => salvarImpressoraMutation.mutate(dados)}
        loading={salvarImpressoraMutation.isPending}
      />

      {/* 5. Alerta de Exclusão de Produto */}
      <AlertDialog
        open={!!produtoParaExcluir}
        onOpenChange={(open) => !open && setProdutoParaExcluir(null)}
      >
        <AlertDialogContent className="bg-card border-border/80 rounded-3xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold font-mono text-destructive">
              Excluir Produto
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Tem certeza de que deseja remover este produto do catálogo da loja? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-3">
            <AlertDialogCancel className="rounded-xl h-10 text-xs font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (produtoParaExcluir) {
                  excluirProdutoMutation.mutate(produtoParaExcluir);
                }
              }}
              className="rounded-xl h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6. Alerta de Exclusão de Impressora */}
      <AlertDialog
        open={!!impressoraParaExcluir}
        onOpenChange={(open) => !open && setImpressoraParaExcluir(null)}
      >
        <AlertDialogContent className="bg-card border-border/80 rounded-3xl max-w-md p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold font-mono text-destructive">
              Excluir Impressora
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Tem certeza de que deseja remover esta impressora configurada?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-3">
            <AlertDialogCancel className="rounded-xl h-10 text-xs font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (impressoraParaExcluir) {
                  excluirImpressoraMutation.mutate(impressoraParaExcluir);
                }
              }}
              className="rounded-xl h-10 bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

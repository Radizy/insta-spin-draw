import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ChevronRight,
  Lock,
  Check,
  Zap,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  Minus,
  FileText,
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
  fetchEtiquetaConfigLoja,
  updateEtiquetaUltimasPreferencias,
  calcularDataValidade,
  formatarDataBR,
  getHoraAtualHHMM,
  CATEGORIAS_PADRAO,
  MODELOS_ETIQUETAS,
  ModeloEtiquetaId,
  TipoLayoutEtiqueta,
} from '@/lib/api-etiquetas';
import { getHojeLocalYMD } from '@/lib/api';
import { SemPesoConfirmModal } from '@/components/etiquetas/SemPesoConfirmModal';
import { EtiquetaPreviewModal } from '@/components/etiquetas/EtiquetaPreviewModal';
import {
  DadosImpressaoEtiqueta,
  imprimirEtiquetasEmLote,
} from '@/lib/etiquetas-print';
import { CadastroProdutoModal } from '@/components/etiquetas/CadastroProdutoModal';
import { CadastroImpressoraModal } from '@/components/etiquetas/CadastroImpressoraModal';

/** Formata e ajusta automaticamente o peso digitado em gramas (g) ou quilos (kg) */
function autoFormatarPeso(valorBruto: string): string {
  if (!valorBruto) return '';
  const limpo = valorBruto.trim();

  // Se já termina explicitamente com unidade
  if (/g$/i.test(limpo) || /kg$/i.test(limpo)) {
    return limpo;
  }

  const normalizado = limpo.replace(',', '.');
  const num = parseFloat(normalizado);

  if (isNaN(num) || num <= 0) {
    return limpo;
  }

  // Se possui ponto decimal (ex: 1.5, 0.5, 2.25) -> formata em kg
  if (normalizado.includes('.')) {
    return `${num}kg`;
  }

  // Se é número inteiro
  if (num >= 1000) {
    const emKg = num / 1000;
    return `${emKg}kg`;
  } else if (num >= 20) {
    // 20 a 999 -> gramas (ex: 250 -> 250g, 500 -> 500g)
    return `${num}g`;
  } else {
    // 1 a 19 -> quilos (ex: 1 -> 1kg, 2 -> 2kg, 5 -> 5kg)
    return `${num}kg`;
  }
}

/** Incrementa ou decrementa o peso em kg (+1, -1, +5, -5, +0.25, etc) mantendo a formatação amigável */
function ajustarPesoDelta(pesoAtual: string, deltaKg: number): string {
  const limpo = (pesoAtual || '').trim().toLowerCase().replace(',', '.');
  let kgAtual = 0;

  if (limpo.endsWith('kg')) {
    kgAtual = parseFloat(limpo.replace('kg', '')) || 0;
  } else if (limpo.endsWith('g')) {
    kgAtual = (parseFloat(limpo.replace('g', '')) || 0) / 1000;
  } else if (limpo) {
    const num = parseFloat(limpo) || 0;
    kgAtual = num >= 20 ? num / 1000 : num;
  }

  const novoKg = Math.max(0, Math.round((kgAtual + deltaKg) * 1000) / 1000);

  if (novoKg <= 0) return '';
  if (novoKg >= 1) {
    return Number.isInteger(novoKg) ? `${novoKg}kg` : `${novoKg}kg`;
  } else {
    const g = Math.round(novoKg * 1000);
    return `${g}g`;
  }
}

export default function Etiquetas() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Estados de Abas
  const [activeTab, setActiveTab] = useState<'producao' | 'descongelamento' | 'produtos' | 'impressoras' | 'historico'>('producao');

  // Relógio em tempo real para data/hora fixa
  const [horaAtual, setHoraAtual] = useState<string>(getHoraAtualHHMM());
  const dataHoje = useMemo(() => getHojeLocalYMD(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraAtual(getHoraAtualHHMM());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Busca e Filtros nos Catálogos de Seleção Rápida
  const [buscaCatalogoProd, setBuscaCatalogoProd] = useState('');
  const [catCatalogoProd, setCatCatalogoProd] = useState('todas');
  const [buscaCatalogoDesc, setBuscaCatalogoDesc] = useState('');
  const [catCatalogoDesc, setCatCatalogoDesc] = useState('todas');

  // Formulário Aba Produção
  const [prodProdutoId, setProdProdutoId] = useState<string>('');
  const [prodPeso, setProdPeso] = useState<string>('');
  const [prodQuantidade, setProdQuantidade] = useState<number>(1);
  const [prodImpressoraId, setProdImpressoraId] = useState<string>('');
  const [prodModeloEtiqueta, setProdModeloEtiqueta] = useState<ModeloEtiquetaId>('80x30');
  const [prodColunas, setProdColunas] = useState<number>(1);
  const [prodLayoutEtiqueta, setProdLayoutEtiqueta] = useState<TipoLayoutEtiqueta>('completa');
  const [mostrarConfigAvancadaProd, setMostrarConfigAvancadaProd] = useState<boolean>(false);

  // Formulário Aba Descongelamento (Sem campo de peso - apenas vias e multi-seleção)
  const [descImpressoraId, setDescImpressoraId] = useState<string>('');
  const [descModeloEtiqueta, setDescModeloEtiqueta] = useState<ModeloEtiquetaId>('80x30');
  const [descColunas, setDescColunas] = useState<number>(1);
  const [descLayoutEtiqueta, setDescLayoutEtiqueta] = useState<TipoLayoutEtiqueta>('completa');
  const [mostrarConfigAvancadaDesc, setMostrarConfigAvancadaDesc] = useState<boolean>(false);
  const [descItensSelecionados, setDescItensSelecionados] = useState<Record<string, { selected: boolean; vias: number }>>({});

  // Modais
  const [semPesoModalOpen, setSemPesoModalOpen] = useState(false);
  const [pendenteDadosSemPeso, setPendenteDadosSemPeso] = useState<DadosImpressaoEtiqueta | null>(null);
  const [modoPendenteSemPeso, setModoPendenteSemPeso] = useState<'preview' | 'direto'>('direto');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [dadosParaPreview, setDadosParaPreview] = useState<DadosImpressaoEtiqueta | null>(null);
  const [itensParaPreview, setItensParaPreview] = useState<DadosImpressaoEtiqueta[]>([]);

  // Modais de Cadastro / Edição
  const [produtoModalOpen, setProdutoModalOpen] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<EtiquetaProduto | null>(null);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<string | null>(null);

  const [impressoraModalOpen, setImpressoraModalOpen] = useState(false);
  const [impressoraEditando, setImpressoraEditando] = useState<EtiquetaImpressora | null>(null);
  const [impressoraParaExcluir, setImpressoraParaExcluir] = useState<string | null>(null);

  // Filtros nas listagens de gestão
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

  // 1. Query Produtos (sincroniza a cada 10s com o banco)
  const {
    data: produtos = [],
    isLoading: loadingProdutos,
    refetch: refetchProdutos,
  } = useQuery({
    queryKey: ['etiquetas-produtos', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchEtiquetaProdutos(selectedUnit, user?.franquiaId) : []),
    enabled: !!selectedUnit,
    refetchInterval: 10000,
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

  // 4. Query Configurações da Loja
  const {
    data: configLoja,
    refetch: refetchConfigLoja,
  } = useQuery({
    queryKey: ['etiquetas-config-loja', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchEtiquetaConfigLoja(selectedUnit, user?.franquiaId) : null),
    enabled: !!selectedUnit,
  });

  // Produtos ativos para os selects e grid
  const produtosAtivos = useMemo(() => produtos.filter((p) => p.ativo), [produtos]);

  // Define produto padrão inicial quando carregar
  useEffect(() => {
    if (produtosAtivos.length > 0) {
      if (!prodProdutoId) {
        setProdProdutoId(produtosAtivos[0].id);
      }
    }
  }, [produtosAtivos, prodProdutoId]);

  // Atualiza estados com os padrões configurados para a loja ou impressora ativa
  useEffect(() => {
    if (configLoja) {
      if (configLoja.modelo_padrao) {
        setProdModeloEtiqueta(configLoja.modelo_padrao);
        setDescModeloEtiqueta(configLoja.modelo_padrao);
      }
      if (configLoja.colunas_padrao) {
        setProdColunas(configLoja.colunas_padrao);
        setDescColunas(configLoja.colunas_padrao);
      }
      if (configLoja.layout_padrao) {
        setProdLayoutEtiqueta(configLoja.layout_padrao);
        setDescLayoutEtiqueta(configLoja.layout_padrao);
      }
      if (configLoja.quantidade_padrao) {
        setProdQuantidade(configLoja.quantidade_padrao);
        setDescQuantidade(configLoja.quantidade_padrao);
      }
      if (configLoja.impressora_padrao_id) {
        setProdImpressoraId(configLoja.impressora_padrao_id);
        setDescImpressoraId(configLoja.impressora_padrao_id);
      }
    } else {
      const impressoraAtiva = impressoras.find((i) => i.ativa);
      if (impressoraAtiva) {
        if (!prodImpressoraId) setProdImpressoraId(impressoraAtiva.id);
        if (!descImpressoraId) setDescImpressoraId(impressoraAtiva.id);
      }
    }
  }, [configLoja, impressoras]);

  // Produtos filtrados no catálogo da Produção
  const produtosCatalogoProducao = useMemo(() => {
    return produtosAtivos.filter((p) => {
      const matchBusca =
        !buscaCatalogoProd.trim() ||
        p.nome.toLowerCase().includes(buscaCatalogoProd.toLowerCase()) ||
        p.categoria.toLowerCase().includes(buscaCatalogoProd.toLowerCase());
      const matchCat = catCatalogoProd === 'todas' || p.categoria === catCatalogoProd;
      return matchBusca && matchCat;
    });
  }, [produtosAtivos, buscaCatalogoProd, catCatalogoProd]);

  // Produtos filtrados no catálogo do Descongelamento
  const produtosCatalogoDescongelamento = useMemo(() => {
    return produtosAtivos.filter((p) => {
      const matchBusca =
        !buscaCatalogoDesc.trim() ||
        p.nome.toLowerCase().includes(buscaCatalogoDesc.toLowerCase()) ||
        p.categoria.toLowerCase().includes(buscaCatalogoDesc.toLowerCase());
      const matchCat = catCatalogoDesc === 'todas' || p.categoria === catCatalogoDesc;
      return matchBusca && matchCat;
    });
  }, [produtosAtivos, buscaCatalogoDesc, catCatalogoDesc]);

  // Helpers de seleção múltipla e quantidade de vias por item no Descongelamento
  const getViasDesc = (produtoId: string): number => {
    return descItensSelecionados[produtoId]?.vias || 1;
  };

  const isDescSelected = (produtoId: string): boolean => {
    return !!descItensSelecionados[produtoId]?.selected;
  };

  const toggleSelectDesc = (produtoId: string) => {
    setDescItensSelecionados((prev) => {
      const atual = prev[produtoId];
      const novoStatus = !atual?.selected;
      return {
        ...prev,
        [produtoId]: {
          selected: novoStatus,
          vias: atual?.vias || 1,
        },
      };
    });
  };

  const alterarViasDesc = (produtoId: string, delta: number) => {
    setDescItensSelecionados((prev) => {
      const atual = prev[produtoId] || { selected: true, vias: 1 };
      const novaQtd = Math.max(1, Math.min(100, (atual.vias || 1) + delta));
      return {
        ...prev,
        [produtoId]: {
          selected: true,
          vias: novaQtd,
        },
      };
    });
  };

  const handleSelecionarTodosDesc = () => {
    setDescItensSelecionados((prev) => {
      const next = { ...prev };
      produtosCatalogoDescongelamento.forEach((p) => {
        next[p.id] = { selected: true, vias: next[p.id]?.vias || 1 };
      });
      return next;
    });
  };

  const handleLimparSelecaoDesc = () => {
    setDescItensSelecionados({});
  };

  // Lista dos produtos marcados para descongelar com suas respectivas vias
  const itensSelecionadosDescongelamento = useMemo(() => {
    const list: { produto: EtiquetaProduto; vias: number }[] = [];
    produtosAtivos.forEach((p) => {
      const estado = descItensSelecionados[p.id];
      if (estado?.selected) {
        list.push({ produto: p, vias: Math.max(1, estado.vias || 1) });
      }
    });
    return list;
  }, [produtosAtivos, descItensSelecionados]);

  // Se houver exatamente 1 produto selecionado no descongelamento
  const itemUnicoSelecionadoDesc = useMemo(() => {
    return itensSelecionadosDescongelamento.length === 1 ? itensSelecionadosDescongelamento[0] : null;
  }, [itensSelecionadosDescongelamento]);

  const totalViasSelecionadasDesc = useMemo(() => {
    return itensSelecionadosDescongelamento.reduce((acc, it) => acc + it.vias, 0);
  }, [itensSelecionadosDescongelamento]);

  // Objeto do produto selecionado
  const produtoSelecionadoProducao = useMemo(() => {
    return produtosAtivos.find((p) => p.id === prodProdutoId) || produtosAtivos[0];
  }, [produtosAtivos, prodProdutoId]);

  // Validade calculada para produção (dias do cadastro)
  const validadeCalculadaProducao = useMemo(() => {
    if (!produtoSelecionadoProducao) return dataHoje;
    return calcularDataValidade(dataHoje, produtoSelecionadoProducao.validade_producao_dias || 1);
  }, [produtoSelecionadoProducao, dataHoje]);

  // Validade calculada para descongelamento (padrão dia seguinte / 1 dia)
  const validadeCalculadaDescongelamento = useMemo(() => {
    if (!itemUnicoSelecionadoDesc) return calcularDataValidade(dataHoje, 1);
    // Padrão obrigatório: dia seguinte (1 dia) conforme norma operacional
    const dias = itemUnicoSelecionadoDesc.produto.validade_descongelamento_dias || 1;
    return calcularDataValidade(dataHoje, dias);
  }, [itemUnicoSelecionadoDesc, dataHoje]);

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
        colunas: dados.colunas || 1,
        layout_etiqueta: dados.layout || 'completa',
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
      refetchProdutos();
      toast.success('Produto excluído com sucesso');
      setProdutoParaExcluir(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao excluir produto'),
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
      refetchImpressoras();
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
      refetchImpressoras();
      toast.success('Impressora removida com sucesso');
      setImpressoraParaExcluir(null);
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao excluir impressora'),
  });

  // Executa impressão direta da produção e registra no histórico (sem modal)
  const executarImpressaoProducao = (dados: DadosImpressaoEtiqueta) => {
    const ok = imprimirEtiquetasEmLote([dados], {
      modelo: prodModeloEtiqueta,
      colunas: prodColunas,
      layout: prodLayoutEtiqueta,
    });
    if (ok) {
      salvarHistoricoMutation.mutate(dados);
    }
  };

  // Botão Imprimir Direto (Produção) - imprime direto sem abrir o preview modal
  const handleImprimirProducaoDireto = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!produtoSelecionadoProducao) {
      toast.error('Selecione um produto para continuar.');
      return;
    }

    const imp = impressoras.find((i) => i.id === prodImpressoraId);
    const pesoFormatado = prodPeso.trim() ? autoFormatarPeso(prodPeso) : null;

    const dadosMontados: DadosImpressaoEtiqueta = {
      tipo: 'PRODUÇÃO',
      produtoNome: produtoSelecionadoProducao.nome,
      categoria: produtoSelecionadoProducao.categoria,
      peso: pesoFormatado,
      dataOperacao: dataHoje,
      horaOperacao: getHoraAtualHHMM(),
      dataValidade: validadeCalculadaProducao,
      quantidade: Math.max(1, prodQuantidade || 1),
      unidade: selectedUnit!,
      usuarioNome: user?.username || 'Operador',
      impressoraNome: imp?.nome || 'Elgin L42 Pro Full',
      modeloEtiqueta: prodModeloEtiqueta,
      colunas: prodColunas,
      layout: prodLayoutEtiqueta,
    };

    // Confirmação rápida se não digitou o peso
    if (!pesoFormatado) {
      setPendenteDadosSemPeso(dadosMontados);
      setModoPendenteSemPeso('direto');
      setSemPesoModalOpen(true);
      return;
    }

    executarImpressaoProducao(dadosMontados);
  };

  // Botão Pré-Visualizar (Produção) - abre o modal que já temos
  const handlePrevisualizarProducao = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!produtoSelecionadoProducao) {
      toast.error('Selecione um produto para continuar.');
      return;
    }

    const imp = impressoras.find((i) => i.id === prodImpressoraId);
    const pesoFormatado = prodPeso.trim() ? autoFormatarPeso(prodPeso) : null;

    const dadosMontados: DadosImpressaoEtiqueta = {
      tipo: 'PRODUÇÃO',
      produtoNome: produtoSelecionadoProducao.nome,
      categoria: produtoSelecionadoProducao.categoria,
      peso: pesoFormatado,
      dataOperacao: dataHoje,
      horaOperacao: getHoraAtualHHMM(),
      dataValidade: validadeCalculadaProducao,
      quantidade: Math.max(1, prodQuantidade || 1),
      unidade: selectedUnit!,
      usuarioNome: user?.username || 'Operador',
      impressoraNome: imp?.nome || 'Elgin L42 Pro Full',
      modeloEtiqueta: prodModeloEtiqueta,
      colunas: prodColunas,
      layout: prodLayoutEtiqueta,
    };

    if (!pesoFormatado) {
      setPendenteDadosSemPeso(dadosMontados);
      setModoPendenteSemPeso('preview');
      setSemPesoModalOpen(true);
      return;
    }

    setItensParaPreview([]);
    setDadosParaPreview(dadosMontados);
    setPreviewModalOpen(true);
  };

  // Monta lista de itens para impressão no Descongelamento (apenas itens marcados)
  const montarItensImpressaoDescongelamento = (): DadosImpressaoEtiqueta[] => {
    const imp = impressoras.find((i) => i.id === descImpressoraId);
    if (itensSelecionadosDescongelamento.length === 0) {
      return [];
    }

    return itensSelecionadosDescongelamento.map(({ produto, vias }) => ({
      tipo: 'DESCONGELAMENTO' as const,
      produtoNome: produto.nome,
      categoria: produto.categoria,
      peso: null, // Descongelamento não tem peso
      dataOperacao: dataHoje,
      horaOperacao: getHoraAtualHHMM(),
      dataValidade: calcularDataValidade(dataHoje, produto.validade_descongelamento_dias || 1),
      quantidade: vias,
      unidade: selectedUnit!,
      usuarioNome: user?.username || 'Operador',
      impressoraNome: imp?.nome || 'Elgin L42 Pro Full',
      modeloEtiqueta: descModeloEtiqueta,
      colunas: descColunas,
      layout: descLayoutEtiqueta,
    }));
  };

  // Botão Imprimir Direto (Descongelamento) - imprime todos os itens selecionados juntos sem abrir modal!
  const handleImprimirDescongelamentoDireto = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const itens = montarItensImpressaoDescongelamento();
    if (itens.length === 0) {
      toast.error('Selecione pelo menos um produto para descongelar.');
      return;
    }

    const ok = imprimirEtiquetasEmLote(itens, {
      modelo: descModeloEtiqueta,
      colunas: descColunas,
      layout: descLayoutEtiqueta,
    });

    if (ok) {
      itens.forEach((it) => salvarHistoricoMutation.mutate(it));
      toast.success(`${itens.length} produto(s) enviado(s) para impressão térmica!`);
      handleLimparSelecaoDesc();
    }
  };

  // Botão Pré-Visualizar (Descongelamento) - abre o modal com todos os itens do lote
  const handlePrevisualizarDescongelamento = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const itens = montarItensImpressaoDescongelamento();
    if (itens.length === 0) {
      toast.error('Selecione pelo menos um produto para descongelar.');
      return;
    }

    setItensParaPreview(itens);
    setDadosParaPreview(itens[0]);
    setPreviewModalOpen(true);
  };

  // Impressão direta sem peso (1 toque rápido)
  const handleImprimirSemPesoDireto = (tipo: 'PRODUÇÃO' | 'DESCONGELAMENTO') => {
    if (tipo === 'DESCONGELAMENTO') {
      handleImprimirDescongelamentoDireto();
      return;
    }

    if (!produtoSelecionadoProducao) {
      toast.error('Selecione um produto.');
      return;
    }
    const imp = impressoras.find((i) => i.id === prodImpressoraId);
    const dados: DadosImpressaoEtiqueta = {
      tipo: 'PRODUÇÃO',
      produtoNome: produtoSelecionadoProducao.nome,
      categoria: produtoSelecionadoProducao.categoria,
      peso: null,
      dataOperacao: dataHoje,
      horaOperacao: getHoraAtualHHMM(),
      dataValidade: validadeCalculadaProducao,
      quantidade: Math.max(1, prodQuantidade || 1),
      unidade: selectedUnit!,
      usuarioNome: user?.username || 'Operador',
      impressoraNome: imp?.nome || 'Elgin L42 Pro Full',
      modeloEtiqueta: prodModeloEtiqueta,
      colunas: prodColunas,
      layout: prodLayoutEtiqueta,
    };

    executarImpressaoProducao(dados);
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
                refetchConfigLoja();
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
              onClick={() => navigate('/config?tab=etiquetas')}
              className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold gap-2 h-10 px-3.5 rounded-xl shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Padrões da Loja
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
          <TabsContent value="producao" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Coluna 1: Catálogo Visual de Produtos (Busca Instantânea & Filtros) */}
              <div className="xl:col-span-7 space-y-4">
                <div className="bg-card/70 border border-border/80 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-amber-500" />
                      <h2 className="text-base font-bold text-foreground font-mono">
                        Selecione o Produto para Produção
                      </h2>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setProdutoEditando(null);
                        setProdutoModalOpen(true);
                      }}
                      className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 text-xs h-8 px-3 rounded-xl gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo Item
                    </Button>
                  </div>

                  {/* Barra de Busca Proeminente */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="🔍 Digite para buscar produto por nome ou categoria (ex: mussarela, calabresa, molho)..."
                      value={buscaCatalogoProd}
                      onChange={(e) => setBuscaCatalogoProd(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-2xl bg-card border-border font-medium text-sm"
                    />
                    {buscaCatalogoProd && (
                      <button
                        type="button"
                        onClick={() => setBuscaCatalogoProd('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtro por Categorias (Chips) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setCatCatalogoProd('todas')}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-all ${
                        catCatalogoProd === 'todas'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      Todas ({produtosAtivos.length})
                    </button>
                    {CATEGORIAS_PADRAO.map((cat) => {
                      const count = produtosAtivos.filter((p) => p.categoria === cat).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCatCatalogoProd(cat)}
                          className={`text-xs px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-all ${
                            catCatalogoProd === cat
                              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                              : 'bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary'
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid Visual de Cards de Produtos */}
                {loadingProdutos ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                    <span className="text-xs">Carregando catálogo de produtos...</span>
                  </div>
                ) : produtosCatalogoProducao.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-border rounded-3xl p-6 bg-card/40">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                    <h3 className="text-sm font-bold text-foreground">Nenhum produto encontrado</h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Tente buscar com outro termo ou cadastre um novo produto.
                    </p>
                    <Button
                      size="sm"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
                    {produtosCatalogoProducao.map((p) => {
                      const isSelected = prodProdutoId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProdProdutoId(p.id)}
                          className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 cursor-pointer select-none group relative ${
                            isSelected
                              ? 'bg-amber-950/30 border-amber-500 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/50 scale-[1.01]'
                              : 'bg-card/70 border-border/70 hover:border-amber-500/40 hover:bg-card/90 shadow-sm'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                                {p.categoria}
                              </span>
                              {isSelected && (
                                <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-extrabold uppercase text-foreground leading-snug group-hover:text-amber-400 transition-colors">
                              {p.nome}
                            </h4>
                          </div>

                          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Validade:
                            </span>
                            <span className="font-mono font-bold text-amber-400 text-xs">
                              {p.validade_producao_dias} {p.validade_producao_dias === 1 ? 'dia' : 'dias'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coluna 2: Painel de Emissão / Configuração da Etiqueta */}
              <div className="xl:col-span-5 space-y-4">
                <div className="bg-card/80 border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                      <Printer className="w-5 h-5 text-amber-400" />
                      Painel de Emissão
                    </h3>
                    <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold">
                      Produção
                    </Badge>
                  </div>

                  {/* Card do Produto Selecionado */}
                  {produtoSelecionadoProducao ? (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-amber-400/80 tracking-wider block">
                          {produtoSelecionadoProducao.categoria}
                        </span>
                        <h4 className="text-base font-black text-foreground uppercase truncate">
                          {produtoSelecionadoProducao.nome}
                        </h4>
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Validade cadastrada: <strong className="text-amber-300 font-mono">{produtoSelecionadoProducao.validade_producao_dias} dias</strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-secondary/40 border border-border text-center text-xs text-muted-foreground">
                      Selecione um produto no catálogo à esquerda para emitir
                    </div>
                  )}

                  <form onSubmit={handlePrevisualizarProducao} className="space-y-4">
                    {/* Campo de Peso Inteligente com Botões Rápidos */}
                    <div className="space-y-2.5 p-4 rounded-2xl bg-secondary/30 border border-border/70">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Scale className="w-4 h-4 text-amber-400" />
                          Peso do Produto (Opcional)
                        </Label>
                        {prodPeso ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                              {autoFormatarPeso(prodPeso)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setProdPeso('')}
                              className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 font-medium transition-colors"
                              title="Limpar peso"
                            >
                              <RotateCcw className="w-3 h-3" /> Zerar
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Sem peso definido</span>
                        )}
                      </div>

                      {/* Display & Input Central */}
                      <div className="relative">
                        <Input
                          placeholder="Sem peso (digite ou use os botões abaixo)..."
                          value={prodPeso}
                          onChange={(e) => setProdPeso(e.target.value)}
                          onBlur={(e) => setProdPeso(autoFormatarPeso(e.target.value))}
                          className="h-11 rounded-xl bg-card border-border font-mono font-black text-center text-sm placeholder:text-muted-foreground/60 placeholder:text-xs"
                        />
                        {prodPeso && (
                          <button
                            type="button"
                            onClick={() => setProdPeso('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Botões Rápidos de Peso (-5kg, -1kg, +1kg, +5kg) */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProdPeso(ajustarPesoDelta(prodPeso, -5))}
                          className="h-10 rounded-xl font-mono font-black text-xs bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 border border-border transition-all active:scale-95 flex items-center justify-center text-foreground shadow-sm"
                        >
                          -5kg
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdPeso(ajustarPesoDelta(prodPeso, -1))}
                          className="h-10 rounded-xl font-mono font-black text-xs bg-card hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 border border-border transition-all active:scale-95 flex items-center justify-center text-foreground shadow-sm"
                        >
                          -1kg
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdPeso(ajustarPesoDelta(prodPeso, 1))}
                          className="h-10 rounded-xl font-mono font-black text-xs bg-card hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/50 border border-border transition-all active:scale-95 flex items-center justify-center text-foreground shadow-sm"
                        >
                          +1kg
                        </button>
                        <button
                          type="button"
                          onClick={() => setProdPeso(ajustarPesoDelta(prodPeso, 5))}
                          className="h-10 rounded-xl font-mono font-black text-xs bg-card hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/50 border border-border transition-all active:scale-95 flex items-center justify-center text-foreground shadow-sm"
                        >
                          +5kg
                        </button>
                      </div>

                      {/* Micro-atalhos de gramas e presets */}
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <div className="flex items-center gap-1">
                          {['+250g', '+500g'].map((preset) => {
                            const delta = preset === '+250g' ? 0.25 : 0.5;
                            return (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setProdPeso(ajustarPesoDelta(prodPeso, delta))}
                                className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-border/80 bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground font-semibold transition-all active:scale-95"
                              >
                                {preset}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          {['500g', '1kg', '2kg'].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setProdPeso(preset)}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                                prodPeso === preset
                                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                                  : 'border-border/60 text-muted-foreground/80 hover:text-foreground'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Datas e Horas: Produção e Validade Compactas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            Produção
                          </span>
                          <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950/30 px-1.5 py-0.2 rounded border border-emerald-500/30">
                            Hoje
                          </span>
                        </div>
                        <div className="pt-0.5">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {formatarDataBR(dataHoje)} <span className="text-[11px] text-muted-foreground font-medium">às {horaAtual}</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Validade
                          </span>
                          <span className="text-[9px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30">
                            +{produtoSelecionadoProducao?.validade_producao_dias || 1}d
                          </span>
                        </div>
                        <div className="pt-0.5">
                          <span className="text-xs font-mono font-bold text-amber-300">
                            {formatarDataBR(validadeCalculadaProducao)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantidade de Impressões */}
                    <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/30 border border-border/70">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">Quantidade de Impressões</Label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 5, 10].map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => {
                                setProdQuantidade(q);
                                setDescQuantidade(q);
                                if (selectedUnit) updateEtiquetaUltimasPreferencias(selectedUnit, { quantidade: q, franquia_id: user?.franquiaId });
                              }}
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                prodQuantidade === q
                                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                                  : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                              }`}
                            >
                              {q}x
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newQ = Math.max(1, prodQuantidade - 1);
                            setProdQuantidade(newQ);
                            setDescQuantidade(newQ);
                            if (selectedUnit) updateEtiquetaUltimasPreferencias(selectedUnit, { quantidade: newQ, franquia_id: user?.franquiaId });
                          }}
                          className="h-10 w-11 rounded-xl font-bold text-base bg-card"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={prodQuantidade}
                          onChange={(e) => {
                            const newQ = Math.max(1, Number(e.target.value) || 1);
                            setProdQuantidade(newQ);
                            setDescQuantidade(newQ);
                            if (selectedUnit) updateEtiquetaUltimasPreferencias(selectedUnit, { quantidade: newQ, franquia_id: user?.franquiaId });
                          }}
                          className="h-10 rounded-xl bg-card border-border font-mono font-black text-center text-sm flex-1"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newQ = Math.min(100, prodQuantidade + 1);
                            setProdQuantidade(newQ);
                            setDescQuantidade(newQ);
                            if (selectedUnit) updateEtiquetaUltimasPreferencias(selectedUnit, { quantidade: newQ, franquia_id: user?.franquiaId });
                          }}
                          className="h-10 w-11 rounded-xl font-bold text-base bg-card"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Padrão de Impressão Memorizado (Colapsável para limpar a tela) */}
                    <div className="rounded-2xl border border-border/70 bg-secondary/30 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMostrarConfigAvancadaProd(!mostrarConfigAvancadaProd)}
                        className="w-full p-3 flex items-center justify-between text-xs hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-semibold text-foreground">Padrão da Loja:</span>
                          <span className="font-mono text-[11px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {MODELOS_ETIQUETAS.find((m) => m.id === prodModeloEtiqueta)?.nome || prodModeloEtiqueta} • {prodColunas}x • {prodLayoutEtiqueta === 'simples' ? 'Simples' : 'Completa'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 shrink-0 ml-2">
                          <span>{mostrarConfigAvancadaProd ? 'Ocultar' : 'Ajustar'}</span>
                          {mostrarConfigAvancadaProd ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      {mostrarConfigAvancadaProd && (
                        <div className="p-3.5 pt-2 border-t border-border/50 space-y-3 bg-secondary/20 animate-in fade-in-50 duration-200">
                          {/* Impressora e Formato */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-foreground">Impressora Térmica</Label>
                              <Select
                                value={prodImpressoraId}
                                onValueChange={(id) => {
                                  setProdImpressoraId(id);
                                  setDescImpressoraId(id);
                                  if (selectedUnit) updateEtiquetaUltimasPreferencias(selectedUnit, { impressora_id: id, franquia_id: user?.franquiaId });
                                }}
                              >
                                <SelectTrigger className="h-10 rounded-xl bg-card border-border text-xs font-semibold">
                                  <SelectValue placeholder="Selecione..." />
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

                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-foreground">Tamanho da Etiqueta</Label>
                              <Select
                                value={prodModeloEtiqueta}
                                onValueChange={(v) => {
                                  const mod = v as ModeloEtiquetaId;
                                  setProdModeloEtiqueta(mod);
                                  setDescModeloEtiqueta(mod);
                                  const col = mod === '33x21' ? 3 : 1;
                                  setProdColunas(col);
                                  setDescColunas(col);
                                  if (selectedUnit) {
                                    updateEtiquetaUltimasPreferencias(selectedUnit, {
                                      modelo: mod,
                                      colunas: col,
                                      franquia_id: user?.franquiaId,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-10 rounded-xl bg-card border-border text-xs font-semibold">
                                  <SelectValue placeholder="Selecione formato..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {MODELOS_ETIQUETAS.map((m) => (
                                    <SelectItem key={m.id} value={m.id} className="text-xs">
                                      {m.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* ETIQUETA POR LINHA */}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-foreground">ETIQUETA POR LINHA</Label>
                              <span className="text-[10px] text-muted-foreground">
                                {prodColunas} {prodColunas === 1 ? 'etiqueta por linha' : 'etiquetas lado a lado'}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[1, 2, 3, 4].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    setProdColunas(num);
                                    setDescColunas(num);
                                    if (selectedUnit) {
                                      updateEtiquetaUltimasPreferencias(selectedUnit, {
                                        colunas: num,
                                        franquia_id: user?.franquiaId,
                                      });
                                    }
                                  }}
                                  className={`h-9 rounded-xl text-xs font-bold transition-all border ${
                                    prodColunas === num
                                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                                  }`}
                                >
                                  {num}x {num > 1 ? 'Col.' : 'Col.'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Tipo de Etiqueta (Completa vs Simples) */}
                          <div className="space-y-1.5 pt-0.5">
                            <Label className="text-xs font-bold text-foreground">Tipo de Layout</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setProdLayoutEtiqueta('completa');
                                  setDescLayoutEtiqueta('completa');
                                  if (selectedUnit) {
                                    updateEtiquetaUltimasPreferencias(selectedUnit, {
                                      layout: 'completa',
                                      franquia_id: user?.franquiaId,
                                    });
                                  }
                                }}
                                className={`h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                  prodLayoutEtiqueta === 'completa'
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Completa
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setProdLayoutEtiqueta('simples');
                                  setDescLayoutEtiqueta('simples');
                                  if (selectedUnit) {
                                    updateEtiquetaUltimasPreferencias(selectedUnit, {
                                      layout: 'simples',
                                      franquia_id: user?.franquiaId,
                                    });
                                  }
                                }}
                                className={`h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                  prodLayoutEtiqueta === 'simples'
                                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Simples (Limpa)
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-3 space-y-2">
                      <Button
                        type="button"
                        disabled={!produtoSelecionadoProducao}
                        onClick={handleImprimirProducaoDireto}
                        className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 gap-2 transition-all active:scale-[0.99]"
                      >
                        <Printer className="w-5 h-5 stroke-[2.5]" />
                        Imprimir ({prodQuantidade * prodColunas} {prodQuantidade * prodColunas === 1 ? 'etiqueta' : 'etiquetas'})
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={!produtoSelecionadoProducao}
                        onClick={handlePrevisualizarProducao}
                        className="w-full h-10 rounded-xl border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-xs font-semibold gap-1.5"
                      >
                        <FileText className="w-4 h-4 text-amber-400" />
                        Pré-visualizar Etiqueta
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 2: DESCONGELAMENTO                                    */}
          {/* ========================================================= */}
          <TabsContent value="descongelamento" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Coluna 1: Catálogo Visual de Produtos para Descongelar */}
              <div className="xl:col-span-7 space-y-4">
                <div className="bg-card/70 border border-border/80 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Snowflake className="w-5 h-5 text-blue-400" />
                      <h2 className="text-base font-bold text-foreground font-mono">
                        Selecione o Produto para Descongelar
                      </h2>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setProdutoEditando(null);
                        setProdutoModalOpen(true);
                      }}
                      className="border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-xs h-8 px-3 rounded-xl gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Novo Item
                    </Button>
                  </div>

                  {/* Barra de Busca Proeminente */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="🔍 Digite para buscar produto por nome ou categoria..."
                      value={buscaCatalogoDesc}
                      onChange={(e) => setBuscaCatalogoDesc(e.target.value)}
                      className="pl-10 pr-10 h-11 rounded-2xl bg-card border-border font-medium text-sm"
                    />
                    {buscaCatalogoDesc && (
                      <button
                        type="button"
                        onClick={() => setBuscaCatalogoDesc('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtro por Categorias (Chips) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    <button
                      type="button"
                      onClick={() => setCatCatalogoDesc('todas')}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-all ${
                        catCatalogoDesc === 'todas'
                          ? 'bg-blue-500 text-slate-950 border-blue-400 font-bold shadow-sm'
                          : 'bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      Todas ({produtosAtivos.length})
                    </button>
                    {CATEGORIAS_PADRAO.map((cat) => {
                      const count = produtosAtivos.filter((p) => p.categoria === cat).length;
                      if (count === 0) return null;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCatCatalogoDesc(cat)}
                          className={`text-xs px-3 py-1.5 rounded-xl border font-semibold whitespace-nowrap transition-all ${
                            catCatalogoDesc === cat
                              ? 'bg-blue-500 text-slate-950 border-blue-400 font-bold shadow-sm'
                              : 'bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary'
                          }`}
                        >
                          {cat} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid Visual de Cards de Descongelamento com Seleção Múltipla e Vias */}
                {loadingProdutos ? (
                  <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-xs">Carregando catálogo de produtos...</span>
                  </div>
                ) : produtosCatalogoDescongelamento.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-border rounded-3xl p-6 bg-card/40">
                    <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2 opacity-60" />
                    <h3 className="text-sm font-bold text-foreground">Nenhum produto encontrado</h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">
                      Tente buscar com outro termo ou cadastre um novo produto.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Barra de Ações Rápidas de Seleção em Lote */}
                    <div className="flex items-center justify-between px-2 py-1.5 bg-secondary/30 rounded-2xl border border-border/60 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelecionarTodosDesc}
                          className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1.5 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Selecionar Todos ({produtosCatalogoDescongelamento.length})
                        </button>
                        {itensSelecionadosDescongelamento.length > 0 && (
                          <button
                            type="button"
                            onClick={handleLimparSelecaoDesc}
                            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors px-1"
                          >
                            Limpar Seleção
                          </button>
                        )}
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-mono font-bold">
                        {itensSelecionadosDescongelamento.length} {itensSelecionadosDescongelamento.length === 1 ? 'item' : 'itens'} • {totalViasSelecionadasDesc} {totalViasSelecionadasDesc === 1 ? 'etiqueta' : 'etiquetas'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[540px] overflow-y-auto pr-1">
                      {produtosCatalogoDescongelamento.map((p) => {
                        const isSelected = isDescSelected(p.id);
                        const vias = getViasDesc(p.id);

                        return (
                          <div
                            key={p.id}
                            onClick={() => toggleSelectDesc(p.id)}
                            className={`text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-2.5 cursor-pointer select-none group relative ${
                              isSelected
                                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/50 scale-[1.01]'
                                : 'bg-card/70 border-border/70 hover:border-blue-500/40 hover:bg-card/90 shadow-sm'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                                  {p.categoria}
                                </span>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelectDesc(p.id);
                                  }}
                                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                    isDescSelected(p.id)
                                      ? 'bg-blue-500 border-blue-400 text-slate-950'
                                      : 'border-border bg-secondary/50 group-hover:border-blue-400/50'
                                  }`}
                                  title="Marcar item para impressão em lote"
                                >
                                  {isDescSelected(p.id) && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                              </div>
                              <h4 className="text-sm font-extrabold uppercase text-foreground leading-snug group-hover:text-blue-400 transition-colors">
                                {p.nome}
                              </h4>
                            </div>

                            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                                <Snowflake className="w-3 h-3 text-blue-400" />
                                Amanhã (+1d)
                              </span>

                              {/* Contador de Vias por Item */}
                              <div
                                className="flex items-center gap-1 bg-secondary/80 rounded-xl p-0.5 border border-border/70"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => alterarViasDesc(p.id, -1)}
                                  className="w-6 h-6 rounded-lg bg-card text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-xs"
                                  title="Diminuir vias"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center font-mono font-black text-xs text-foreground">
                                  {vias}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => alterarViasDesc(p.id, 1)}
                                  className="w-6 h-6 rounded-lg bg-card text-muted-foreground hover:text-foreground flex items-center justify-center font-bold text-xs"
                                  title="Aumentar vias"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Coluna 2: Painel de Emissão de Descongelamento */}
              <div className="xl:col-span-5 space-y-4">
                <div className="bg-card/80 border border-border/80 rounded-3xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <h3 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                      <Printer className="w-5 h-5 text-blue-400" />
                      Painel de Descongelamento
                    </h3>
                    <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-semibold">
                      {itensSelecionadosDescongelamento.length > 1
                        ? `${itensSelecionadosDescongelamento.length} Itens no Lote`
                        : itensSelecionadosDescongelamento.length === 1
                        ? '1 Item Selecionado'
                        : 'Descongelamento'}
                    </Badge>
                  </div>

                  {/* Card de Resumo: Lote, Produto Único ou Nenhum */}
                  {itensSelecionadosDescongelamento.length > 1 ? (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                          <Layers className="w-4 h-4" />
                          {itensSelecionadosDescongelamento.length} Itens Marcados para Imprimir Juntos
                        </span>
                        <span className="text-xs font-mono font-black text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-lg border border-blue-500/30">
                          {totalViasSelecionadasDesc} {totalViasSelecionadasDesc === 1 ? 'etiqueta' : 'etiquetas'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {itensSelecionadosDescongelamento.map(({ produto, vias }) => (
                          <div
                            key={produto.id}
                            className="flex items-center gap-1.5 bg-card/90 border border-blue-500/30 rounded-xl px-2.5 py-1 text-xs shadow-sm"
                          >
                            <span className="font-bold text-foreground truncate max-w-[150px]">{produto.nome}</span>
                            <span className="font-mono font-black text-blue-400 bg-blue-500/20 px-1.5 py-0.2 rounded text-[11px]">
                              {vias} {vias === 1 ? 'via' : 'vias'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSelectDesc(produto.id)}
                              className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                              title="Remover do lote"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : itemUnicoSelecionadoDesc ? (
                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <Snowflake className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-blue-400/80 tracking-wider block">
                          {itemUnicoSelecionadoDesc.produto.categoria}
                        </span>
                        <h4 className="text-base font-black text-foreground uppercase truncate">
                          {itemUnicoSelecionadoDesc.produto.nome}
                        </h4>
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Validade descongelado: <strong className="text-blue-300 font-mono">Padrão Dia Seguinte (Amanhã)</strong>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl bg-secondary/30 border border-dashed border-border/80 text-center space-y-2">
                      <div className="w-9 h-9 mx-auto rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
                        <Snowflake className="w-4 h-4 opacity-60" />
                      </div>
                      <p className="text-xs font-bold text-foreground">Nenhum produto selecionado</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Selecione um ou mais produtos no catálogo à esquerda para descongelar.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Datas e Horas: Data/Hora de Descongelamento (FIXAS) + Validade Calculada (D+1 Dia Seguinte) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Data & Hora Descongelamento (Bloqueadas em Tempo Real) */}
                      <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/70 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            Data Descongelar
                          </span>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            <Lock className="w-3 h-3" /> Atual
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-sm font-mono font-bold text-foreground block">
                            {formatarDataBR(dataHoje)}
                          </span>
                          <span className="text-xs font-mono font-semibold text-muted-foreground block">
                            às {horaAtual} (Horário Real)
                          </span>
                        </div>
                      </div>

                      {/* Validade Descongelado (Padrão: Dia Seguinte / Amanhã) */}
                      <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Validade Descongelado
                          </span>
                          <span className="text-[10px] text-blue-300 font-bold bg-blue-500/20 px-1.5 py-0.5 rounded border border-blue-500/30">
                            Amanhã (+1d)
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-sm font-mono font-bold text-blue-300 block">
                            {formatarDataBR(validadeCalculadaDescongelamento)}
                          </span>
                          <span className="text-[11px] text-muted-foreground block">
                            Padrão Dia Seguinte
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quantidade de Vias (Quando apenas 1 item está selecionado) */}
                    {itemUnicoSelecionadoDesc && (
                      <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/30 border border-border/70">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-foreground">Quantidade de Vias</Label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 5, 10].map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => {
                                  setDescItensSelecionados((prev) => ({
                                    ...prev,
                                    [itemUnicoSelecionadoDesc.produto.id]: { selected: true, vias: q },
                                  }));
                                }}
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                                  itemUnicoSelecionadoDesc.vias === q
                                    ? 'bg-blue-500 text-slate-950 font-bold border-blue-400'
                                    : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                                }`}
                              >
                                {q}x
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => alterarViasDesc(itemUnicoSelecionadoDesc.produto.id, -1)}
                            className="h-10 w-11 rounded-xl font-bold text-base bg-card"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={itemUnicoSelecionadoDesc.vias}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                              setDescItensSelecionados((prev) => ({
                                ...prev,
                                [itemUnicoSelecionadoDesc.produto.id]: { selected: true, vias: val },
                              }));
                            }}
                            className="h-10 rounded-xl bg-card border-border font-mono font-black text-center text-sm flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => alterarViasDesc(itemUnicoSelecionadoDesc.produto.id, 1)}
                            className="h-10 w-11 rounded-xl font-bold text-base bg-card"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Padrão de Impressão Memorizado da Loja (Colapsável para manter tela limpa) */}
                    <div className="rounded-2xl border border-border/70 bg-secondary/30 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setMostrarConfigAvancadaDesc(!mostrarConfigAvancadaDesc)}
                        className="w-full p-3 flex items-center justify-between text-xs hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-foreground">Padrão da Loja:</span>
                          <span className="font-mono text-[11px] text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            {MODELOS_ETIQUETAS.find((m) => m.id === descModeloEtiqueta)?.nome || descModeloEtiqueta} • {descColunas}x • {descLayoutEtiqueta === 'simples' ? 'Simples' : 'Completa'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-blue-400 shrink-0 ml-2">
                          <span>{mostrarConfigAvancadaDesc ? 'Ocultar' : 'Ajustar'}</span>
                          {mostrarConfigAvancadaDesc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      {mostrarConfigAvancadaDesc && (
                        <div className="p-3.5 pt-2 border-t border-border/50 space-y-3 bg-secondary/20 animate-in fade-in-50 duration-200">
                          {/* Impressora e Formato */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-foreground">Impressora Térmica</Label>
                              <Select
                                value={descImpressoraId}
                                onValueChange={(id) => {
                                  setDescImpressoraId(id);
                                  setProdImpressoraId(id);
                                  if (selectedUnit) updateEtiquetaUltimasPreferencias(selectedUnit, { impressora_id: id, franquia_id: user?.franquiaId });
                                }}
                              >
                                <SelectTrigger className="h-10 rounded-xl bg-card border-border text-xs font-semibold">
                                  <SelectValue placeholder="Selecione..." />
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

                            <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-foreground">Tamanho da Etiqueta</Label>
                              <Select
                                value={descModeloEtiqueta}
                                onValueChange={(v) => {
                                  const mod = v as ModeloEtiquetaId;
                                  setDescModeloEtiqueta(mod);
                                  setProdModeloEtiqueta(mod);
                                  const col = mod === '33x21' ? 3 : 1;
                                  setDescColunas(col);
                                  setProdColunas(col);
                                  if (selectedUnit) {
                                    updateEtiquetaUltimasPreferencias(selectedUnit, {
                                      modelo: mod,
                                      colunas: col,
                                      franquia_id: user?.franquiaId,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-10 rounded-xl bg-card border-border text-xs font-semibold">
                                  <SelectValue placeholder="Selecione formato..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {MODELOS_ETIQUETAS.map((m) => (
                                    <SelectItem key={m.id} value={m.id} className="text-xs">
                                      {m.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {/* ETIQUETA POR LINHA */}
                          <div className="space-y-1.5 pt-0.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-foreground">ETIQUETA POR LINHA</Label>
                              <span className="text-[10px] text-muted-foreground">
                                {descColunas} {descColunas === 1 ? 'etiqueta por linha' : 'etiquetas lado a lado'}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5">
                              {[1, 2, 3, 4].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => {
                                    setDescColunas(num);
                                    setProdColunas(num);
                                    if (selectedUnit) {
                                      updateEtiquetaUltimasPreferencias(selectedUnit, {
                                        colunas: num,
                                        franquia_id: user?.franquiaId,
                                      });
                                    }
                                  }}
                                  className={`h-9 rounded-xl text-xs font-bold transition-all border ${
                                    descColunas === num
                                      ? 'bg-blue-500 text-slate-950 border-blue-500 shadow-sm font-black'
                                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                                  }`}
                                >
                                  {num}x Col.
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Tipo de Etiqueta (Completa vs Simples) */}
                          <div className="space-y-1.5 pt-0.5">
                            <Label className="text-xs font-bold text-foreground">Tipo de Layout</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setDescLayoutEtiqueta('completa');
                                  setProdLayoutEtiqueta('completa');
                                  if (selectedUnit) {
                                    updateEtiquetaUltimasPreferencias(selectedUnit, {
                                      layout: 'completa',
                                      franquia_id: user?.franquiaId,
                                    });
                                  }
                                }}
                                className={`h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                  descLayoutEtiqueta === 'completa'
                                    ? 'bg-blue-500 text-slate-950 border-blue-500 shadow-sm font-black'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                                }`}
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                Completa
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDescLayoutEtiqueta('simples');
                                  setProdLayoutEtiqueta('simples');
                                  if (selectedUnit) {
                                    updateEtiquetaUltimasPreferencias(selectedUnit, {
                                      layout: 'simples',
                                      franquia_id: user?.franquiaId,
                                    });
                                  }
                                }}
                                className={`h-9 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                                  descLayoutEtiqueta === 'simples'
                                    ? 'bg-blue-500 text-slate-950 border-blue-500 shadow-sm font-black'
                                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                                }`}
                              >
                                <FileText className="w-3.5 h-3.5" />
                                Simples (Limpa)
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-3 space-y-2">
                      <Button
                        type="button"
                        onClick={handleImprimirDescongelamentoDireto}
                        disabled={itensSelecionadosDescongelamento.length === 0}
                        className="w-full h-12 rounded-2xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold text-sm shadow-lg shadow-blue-500/20 gap-2 transition-all active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Printer className="w-5 h-5 stroke-[2.5]" />
                        {itensSelecionadosDescongelamento.length === 0
                          ? 'Selecione produtos para imprimir'
                          : `Imprimir (${totalViasSelecionadasDesc * descColunas} ${totalViasSelecionadasDesc * descColunas === 1 ? 'etiqueta' : 'etiquetas'})`}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        disabled={itensSelecionadosDescongelamento.length === 0}
                        onClick={handlePrevisualizarDescongelamento}
                        className="w-full h-10 rounded-xl border-border/80 text-muted-foreground hover:text-foreground hover:bg-secondary/80 text-xs font-semibold gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <FileText className="w-4 h-4 text-blue-400" />
                        Pré-visualizar Etiqueta(s)
                      </Button>
                    </div>
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
        onOpenChange={(isOpen) => {
          setSemPesoModalOpen(isOpen);
          if (!isOpen) {
            setPendenteDadosSemPeso(null);
          }
        }}
        onConfirm={() => {
          const dados = pendenteDadosSemPeso;
          const modo = modoPendenteSemPeso;
          setSemPesoModalOpen(false);
          setPendenteDadosSemPeso(null);

          if (dados) {
            setTimeout(() => {
              if (modo === 'direto') {
                executarImpressaoProducao(dados);
              } else {
                setDadosParaPreview(dados);
                setItensParaPreview([dados]);
                setPreviewModalOpen(true);
              }
            }, 80);
          }
        }}
      />

      {/* 2. Pré-Visualização da Etiqueta Térmica */}
      <EtiquetaPreviewModal
        open={previewModalOpen}
        onOpenChange={(isOpen) => {
          setPreviewModalOpen(isOpen);
          if (!isOpen) {
            setDadosParaPreview(null);
            setItensParaPreview([]);
          }
        }}
        dados={dadosParaPreview}
        itens={itensParaPreview}
        onConfirmPrintBatch={(itens) => {
          itens.forEach((it) => {
            salvarHistoricoMutation.mutate(it);
          });
          if (itens.some((it) => it.tipo === 'DESCONGELAMENTO')) {
            handleLimparSelecaoDesc();
          }
          setPreviewModalOpen(false);
          setDadosParaPreview(null);
          setItensParaPreview([]);
        }}
        onConfirmPrint={(dadosCompletos) => {
          if (dadosCompletos.tipo === 'DESCONGELAMENTO') {
            handleLimparSelecaoDesc();
          }
          if (selectedUnit) {
            updateEtiquetaUltimasPreferencias(selectedUnit, {
              modelo: dadosCompletos.modeloEtiqueta,
              colunas: dadosCompletos.colunas,
              quantidade: dadosCompletos.quantidade,
              layout: dadosCompletos.layout,
              impressora_id: impressoras.find((i) => i.nome === dadosCompletos.impressoraNome)?.id,
              franquia_id: user?.franquiaId,
            }).then(() => {
              queryClient.invalidateQueries({ queryKey: ['etiquetas-config-loja', selectedUnit] });
            });

            // Atualiza os estados locais imediatamente para as próximas emissões
            if (dadosCompletos.modeloEtiqueta) {
              setProdModeloEtiqueta(dadosCompletos.modeloEtiqueta);
              setDescModeloEtiqueta(dadosCompletos.modeloEtiqueta);
            }
            if (dadosCompletos.colunas) {
              setProdColunas(dadosCompletos.colunas);
              setDescColunas(dadosCompletos.colunas);
            }
            if (dadosCompletos.layout) {
              setProdLayoutEtiqueta(dadosCompletos.layout);
              setDescLayoutEtiqueta(dadosCompletos.layout);
            }
            if (dadosCompletos.quantidade) {
              setProdQuantidade(dadosCompletos.quantidade);
              setDescQuantidade(dadosCompletos.quantidade);
            }
          }
          salvarHistoricoMutation.mutate(dadosCompletos);
          setPreviewModalOpen(false);
          setDadosParaPreview(null);
          setItensParaPreview([]);
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

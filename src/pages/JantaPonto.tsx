import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Layout, BackButton } from '@/components/Layout';
import { cn } from '@/lib/utils';
import {
  fetchFuncionariosInternos,
  fetchRegistrosPontoDia,
  registrarCheckinPonto,
  registrarSaidaJanta,
  registrarRetornoJanta,
  createFuncionarioInterno,
  updateFuncionarioInterno,
  deleteFuncionarioInterno,
  resetPontoEquipeInterna,
  resetPontoFuncionario,
  getHojeLocalYMD,
  FuncionarioInterno,
  RegistroPontoIntervalo,
} from '@/lib/api';
import { FuncionarioCard } from '@/components/janta-ponto/FuncionarioCard';
import { CadastroFuncionarioModal } from '@/components/janta-ponto/CadastroFuncionarioModal';
import { PlanilhaHistoricoModal } from '@/components/janta-ponto/PlanilhaHistoricoModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  UtensilsCrossed,
  UserPlus,
  FileSpreadsheet,
  Users,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  CheckSquare,
  X
} from 'lucide-react';
import { toast } from 'sonner';

type FiltroStatus = 'todos' | 'trabalhando' | 'em_janta' | 'ausente' | 'finalizado';

export default function JantaPonto() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  const [modalCadastroOpen, setModalCadastroOpen] = useState(false);
  const [funcionarioEditando, setFuncionarioEditando] = useState<FuncionarioInterno | null>(null);
  const [modalPlanilhaOpen, setModalPlanilhaOpen] = useState(false);
  const [funcionarioParaExcluir, setFuncionarioParaExcluir] = useState<string | null>(null);
  const [funcionarioParaResetar, setFuncionarioParaResetar] = useState<FuncionarioInterno | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Timer de Auto-Reset de 30 segundos quando o filtro não for 'todos'
  useEffect(() => {
    if (filtroStatus === 'todos') {
      setSegundosRestantes(null);
      return;
    }

    setSegundosRestantes(30);

    const interval = setInterval(() => {
      setSegundosRestantes((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setFiltroStatus('todos');
          toast.info('Filtro automático redefinido para "Todos".', { duration: 2500 });
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [filtroStatus]);

  const getNomeFiltro = (f: FiltroStatus): string => {
    switch (f) {
      case 'trabalhando': return 'Na Loja';
      case 'em_janta': return 'Em Janta';
      case 'ausente': return 'Ausentes';
      case 'finalizado': return 'Finalizados';
      default: return 'Todos';
    }
  };

  const dataHojeFormatada = useMemo(() => {
    return getHojeLocalYMD();
  }, []);

  const dataExibicao = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // 1. Busca lista de funcionários da loja (isolamento estrito por loja e franquia)
  const {
    data: funcionarios = [],
    isLoading: loadingFuncionarios,
    refetch: refetchFuncionarios,
    isFetching: isFetchingFuncionarios,
  } = useQuery({
    queryKey: ['funcionarios-internos', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchFuncionariosInternos(selectedUnit, true, user?.franquiaId) : []),
    enabled: !!selectedUnit,
  });

  // 2. Busca registros de ponto do dia atual
  const {
    data: registrosHoje = [],
    isLoading: loadingRegistros,
    refetch: refetchRegistros,
  } = useQuery({
    queryKey: ['registros-ponto-dia', selectedUnit, dataHojeFormatada],
    queryFn: () => (selectedUnit ? fetchRegistrosPontoDia(selectedUnit, dataHojeFormatada) : []),
    enabled: !!selectedUnit,
    refetchInterval: 10000,
  });

  // Mapeia registro por funcionário
  const registrosMap = useMemo(() => {
    const map = new Map<string, RegistroPontoIntervalo>();
    registrosHoje.forEach((reg) => {
      map.set(reg.funcionario_id, reg);
    });
    return map;
  }, [registrosHoje]);

  // KPIs
  const stats = useMemo(() => {
    const total = funcionarios.length;
    let trabalhando = 0;
    let emJanta = 0;
    let ausentes = 0;
    let finalizados = 0;

    funcionarios.forEach((f) => {
      const reg = registrosMap.get(f.id);
      const st = reg?.status || 'ausente';
      if (st === 'trabalhando') trabalhando++;
      else if (st === 'em_janta') emJanta++;
      else if (st === 'finalizado') finalizados++;
      else ausentes++;
    });

    return { total, trabalhando, emJanta, ausentes, finalizados };
  }, [funcionarios, registrosMap]);

  // Filtro composto (Status rápido + Busca textual)
  const funcionariosFiltrados = useMemo(() => {
    let lista = funcionarios;

    // Filtro por status rápido
    if (filtroStatus !== 'todos') {
      lista = lista.filter((f) => {
        const reg = registrosMap.get(f.id);
        const st = reg?.status || 'ausente';
        return st === filtroStatus;
      });
    }

    // Filtro por busca textual
    if (busca.trim()) {
      const t = busca.toLowerCase();
      lista = lista.filter(
        (f) => f.nome.toLowerCase().includes(t) || f.cargo.toLowerCase().includes(t)
      );
    }

    return lista;
  }, [funcionarios, busca, filtroStatus, registrosMap]);

  // Mutations
  const checkinMutation = useMutation({
    mutationFn: (func: FuncionarioInterno) =>
      registrarCheckinPonto({
        funcionario_id: func.id,
        funcionario_nome: func.nome,
        cargo: func.cargo,
        unidade: selectedUnit!,
        franquia_id: user?.franquiaId,
        data_referencia: dataHojeFormatada,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['registros-ponto-dia'] });
      queryClient.invalidateQueries({ queryKey: ['planilha-ponto'] });
      toast.success(`Check-in registrado para ${data.funcionario?.nome || 'funcionário'}!`);
    },
    onError: () => toast.error('Erro ao registrar check-in'),
  });

  const saidaJantaMutation = useMutation({
    mutationFn: (registroId: string) => registrarSaidaJanta(registroId, selectedUnit!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-ponto-dia'] });
      queryClient.invalidateQueries({ queryKey: ['planilha-ponto'] });
      toast.success('Saída para janta registrada! Cronômetro iniciado.');
    },
    onError: () => toast.error('Erro ao marcar saída para janta'),
  });

  const retornoJantaMutation = useMutation({
    mutationFn: ({ registroId, saidaJantaAt }: { registroId: string; saidaJantaAt: string }) =>
      registrarRetornoJanta(registroId, saidaJantaAt, selectedUnit!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['registros-ponto-dia'] });
      queryClient.invalidateQueries({ queryKey: ['planilha-ponto'] });
      toast.success(
        `Retorno de janta registrado! Tempo total: ${data.tempo_total_janta_minutos || 0} min.`
      );
    },
    onError: () => toast.error('Erro ao marcar retorno de janta'),
  });

  const saveFuncionarioMutation = useMutation({
    mutationFn: async (dados: { nome: string; cargo: string; id?: string }) => {
      if (dados.id) {
        return updateFuncionarioInterno(dados.id, { nome: dados.nome, cargo: dados.cargo }, selectedUnit!);
      } else {
        return createFuncionarioInterno({
          nome: dados.nome,
          cargo: dados.cargo,
          unidade: selectedUnit!,
          franquia_id: user?.franquiaId,
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios-internos'] });
      toast.success(
        variables.id ? 'Funcionário atualizado com sucesso!' : 'Novo funcionário cadastrado!'
      );
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar funcionário'),
  });

  const deleteFuncionarioMutation = useMutation({
    mutationFn: (id: string) => deleteFuncionarioInterno(id, selectedUnit!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funcionarios-internos'] });
      queryClient.invalidateQueries({ queryKey: ['registros-ponto-dia'] });
      toast.success('Funcionário excluído com sucesso');
      setFuncionarioParaExcluir(null);
    },
    onError: () => toast.error('Erro ao excluir funcionário'),
  });

  // Reset individual de um único funcionário
  const resetIndividualMutation = useMutation({
    mutationFn: (func: FuncionarioInterno) =>
      resetPontoFuncionario(func.id, selectedUnit!, dataHojeFormatada),
    onSuccess: (_, func) => {
      queryClient.invalidateQueries({ queryKey: ['registros-ponto-dia'] });
      queryClient.invalidateQueries({ queryKey: ['planilha-ponto'] });
      toast.success(`Expediente de hoje resetado para ${func.nome}!`);
      setFuncionarioParaResetar(null);
    },
    onError: () => toast.error('Erro ao resetar expediente do funcionário'),
  });

  // Reset exclusivo para o ponto e janta da equipe interna (NÃO mexe em motoboys)
  const resetEquipeMutation = useMutation({
    mutationFn: () => resetPontoEquipeInterna(selectedUnit!, dataHojeFormatada),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registros-ponto-dia'] });
      queryClient.invalidateQueries({ queryKey: ['planilha-ponto'] });
      toast.success('Expediente de hoje resetado com sucesso para a equipe interna!');
      setResetDialogOpen(false);
    },
    onError: () => toast.error('Erro ao resetar expediente da equipe'),
  });

  return (
    <Layout>
      <div className="space-y-6">
        <BackButton />

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/80 backdrop-blur-sm border border-border/80 p-6 rounded-3xl shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-foreground flex items-center gap-2">
                  Janta & Ponto
                  <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold">
                    Equipe Interna
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">
                  {dataExibicao} • Loja {selectedUnit}
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botão de Reset Exclusivo da Equipe Interna (lado esquerdo de Atualizar) */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetDialogOpen(true)}
              disabled={resetEquipeMutation.isPending}
              className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs font-bold gap-1.5 h-10 px-3.5 rounded-xl shadow-sm transition-all"
              title="Zerar check-ins e horários de janta da equipe interna de hoje"
            >
              <RotateCcw className={`w-4 h-4 ${resetEquipeMutation.isPending ? 'animate-spin' : ''}`} />
              Resetar Dia (Equipe)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchFuncionarios();
                refetchRegistros();
              }}
              disabled={isFetchingFuncionarios}
              className="border-border text-xs gap-1.5 h-10 px-3 rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingFuncionarios ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              variant="outline"
              onClick={() => setModalPlanilhaOpen(true)}
              className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold gap-2 h-10 px-4 rounded-xl shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              Planilha / Relatório
            </Button>

            <Button
              onClick={() => {
                setFuncionarioEditando(null);
                setModalCadastroOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold gap-2 h-10 px-4 rounded-xl shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              Novo Funcionário
            </Button>
          </div>
        </div>

        {/* KPIs Resumo Operacional como Filtros Rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card: Total na Equipe */}
          <button
            type="button"
            onClick={() => setFiltroStatus('todos')}
            className={cn(
              'text-left rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 border cursor-pointer select-none',
              filtroStatus === 'todos'
                ? 'bg-primary/10 border-primary shadow-md shadow-primary/10 ring-2 ring-primary/40'
                : 'bg-card/60 border-border/60 hover:border-primary/50 hover:bg-card/90 shadow-sm'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                filtroStatus === 'todos'
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : 'bg-secondary text-muted-foreground border border-border/60'
              )}
            >
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Total na Equipe
              </span>
              <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">
                {stats.total}
              </span>
            </div>
          </button>

          {/* Card: Na Loja (Trabalhando) */}
          <button
            type="button"
            onClick={() => setFiltroStatus(filtroStatus === 'trabalhando' ? 'todos' : 'trabalhando')}
            className={cn(
              'text-left rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 border cursor-pointer select-none',
              filtroStatus === 'trabalhando'
                ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-500/15 ring-2 ring-emerald-500/50'
                : 'bg-card/60 border-emerald-500/30 bg-emerald-950/5 hover:border-emerald-500/60 hover:bg-emerald-950/15 shadow-sm'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors border',
                filtroStatus === 'trabalhando'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-sm'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              )}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-emerald-400/90 tracking-wider block">
                Na Loja (Trabalhando)
              </span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                {stats.trabalhando}
              </span>
            </div>
          </button>

          {/* Card: Em Janta Agora */}
          <button
            type="button"
            onClick={() => setFiltroStatus(filtroStatus === 'em_janta' ? 'todos' : 'em_janta')}
            className={cn(
              'text-left rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 border cursor-pointer select-none',
              filtroStatus === 'em_janta'
                ? 'bg-amber-950/35 border-amber-500 shadow-md shadow-amber-500/15 ring-2 ring-amber-500/50'
                : 'bg-card/60 border-amber-500/40 bg-amber-950/10 hover:border-amber-500/70 hover:bg-amber-950/20 shadow-sm'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors border',
                filtroStatus === 'em_janta'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              )}
            >
              <UtensilsCrossed className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-amber-400 tracking-wider block">
                Em Janta Agora
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-0.5 block">
                {stats.emJanta}
              </span>
            </div>
          </button>

          {/* Card: Ausentes / Não Chegou */}
          <button
            type="button"
            onClick={() => setFiltroStatus(filtroStatus === 'ausente' ? 'todos' : 'ausente')}
            className={cn(
              'text-left rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 border cursor-pointer select-none',
              filtroStatus === 'ausente'
                ? 'bg-slate-800/40 border-slate-400 shadow-md shadow-slate-500/10 ring-2 ring-slate-400/40'
                : 'bg-card/60 border-border/60 hover:border-slate-500/50 hover:bg-card/90 shadow-sm'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-colors border',
                filtroStatus === 'ausente'
                  ? 'bg-slate-600 text-white border-slate-500 font-bold'
                  : 'bg-secondary/80 text-muted-foreground border-border/60'
              )}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-muted-foreground tracking-wider block">
                Ausentes / Não Chegou
              </span>
              <span className="text-xl font-bold font-mono text-muted-foreground mt-0.5 block">
                {stats.ausentes}
              </span>
            </div>
          </button>
        </div>

        {/* Feedback visual quando algum filtro de status está ativo com contador de 30s */}
        {filtroStatus !== 'todos' && segundosRestantes !== null && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-fade-in shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
              <span>
                Filtro ativo: <strong className="font-bold text-amber-200 uppercase">{getNomeFiltro(filtroStatus)}</strong>
              </span>
              <span className="text-muted-foreground hidden sm:inline">•</span>
              <span className="text-muted-foreground hidden sm:inline">
                Retorna ao normal em <strong className="text-amber-300 font-mono font-bold">{segundosRestantes}s</strong>
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFiltroStatus('todos')}
              className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 rounded-lg gap-1 font-semibold"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtro
            </Button>
          </div>
        )}

        {/* Barra de Busca */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do funcionário ou cargo (pizzaiolo, atendente, etc)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 h-11 bg-card/60 border-border/80 rounded-xl text-sm"
            >
            </Input>
          </div>
        </div>

        {/* Grid de Cards dos Funcionários */}
        {loadingFuncionarios || loadingRegistros ? (
          <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
            <p className="text-sm font-medium">Carregando equipe interna...</p>
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-border rounded-3xl bg-card/40 p-8">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Nenhum funcionário cadastrado</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-6">
              Cadastre sua equipe interna (pizzaiolos, atendentes, forno, cozinha) para controlar o
              ponto diário e o tempo exato de janta em 1 toque.
            </p>
            <Button
              onClick={() => {
                setFuncionarioEditando(null);
                setModalCadastroOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2 rounded-xl h-11 px-6 shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Primeiro Funcionário
            </Button>
          </div>
        ) : funcionariosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Nenhum funcionário encontrado para "{busca}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {funcionariosFiltrados.map((func) => (
              <FuncionarioCard
                key={func.id}
                funcionario={func}
                registro={registrosMap.get(func.id)}
                onCheckin={(funcObj) => checkinMutation.mutate(funcObj)}
                onSaidaJanta={(regId) => saidaJantaMutation.mutate(regId)}
                onRetornoJanta={(regId, saida) =>
                  retornoJantaMutation.mutate({ registroId: regId, saidaJantaAt: saida })
                }
                onEdit={(f) => {
                  setFuncionarioEditando(f);
                  setModalCadastroOpen(true);
                }}
                onDelete={(id) => setFuncionarioParaExcluir(id)}
                onReset={(f) => setFuncionarioParaResetar(f)}
                loading={
                  checkinMutation.isPending ||
                  saidaJantaMutation.isPending ||
                  retornoJantaMutation.isPending ||
                  resetIndividualMutation.isPending
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cadastro / Edição */}
      <CadastroFuncionarioModal
        open={modalCadastroOpen}
        onOpenChange={setModalCadastroOpen}
        funcionarioToEdit={funcionarioEditando}
        onSave={async (dados) => {
          await saveFuncionarioMutation.mutateAsync(dados);
        }}
      />

      {/* Modal de Planilha e Relatório */}
      {selectedUnit && (
        <PlanilhaHistoricoModal
          open={modalPlanilhaOpen}
          onOpenChange={setModalPlanilhaOpen}
          unidade={selectedUnit}
          franquiaId={user?.franquiaId}
          funcionarios={funcionarios}
        />
      )}

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={!!funcionarioParaExcluir}
        onOpenChange={(open) => !open && setFuncionarioParaExcluir(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir Funcionário?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              Tem certeza que deseja remover este funcionário da equipe interna? Os históricos de
              ponto existentes serão mantidos na planilha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                funcionarioParaExcluir &&
                deleteFuncionarioMutation.mutate(funcionarioParaExcluir)
              }
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Reset Individual de Funcionário */}
      <AlertDialog
        open={!!funcionarioParaResetar}
        onOpenChange={(open) => !open && setFuncionarioParaResetar(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              Resetar Dia de {funcionarioParaResetar?.nome}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-xs space-y-2">
                <p>
                  Deseja zerar os registros de ponto e janta de hoje para{' '}
                  <strong className="text-foreground">{funcionarioParaResetar?.nome}</strong> ({funcionarioParaResetar?.cargo})?
                </p>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-[11px] space-y-1">
                  <p className="text-foreground">
                    ✓ O funcionário voltará para o status <strong className="text-foreground">"Ausente / Não Chegou"</strong>.
                  </p>
                  <p className="text-muted-foreground">
                    ✓ Permitirá registrar novo check-in hoje caso o anterior tenha sido feito por engano.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                funcionarioParaResetar && resetIndividualMutation.mutate(funcionarioParaResetar)
              }
              disabled={resetIndividualMutation.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
            >
              {resetIndividualMutation.isPending ? 'Resetando...' : 'Confirmar Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Reset do Dia (Apenas Equipe Interna) */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-destructive" />
              Resetar Ponto & Janta de Hoje?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-xs space-y-2">
                <p>
                  Tem certeza que deseja resetar os registros de ponto e janta de hoje para a loja{' '}
                  <strong className="text-foreground">{selectedUnit}</strong>?
                </p>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-[11px] space-y-1">
                  <p className="text-emerald-400 font-semibold">
                    ✓ Os motoboys e as filas de entrega NÃO serão afetados.
                  </p>
                  <p className="text-foreground">
                    ✓ Os funcionários cadastrados permanecem na lista, voltando para o estado "Ausente / Não Chegou" para iniciar um novo turno.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetEquipeMutation.mutate()}
              disabled={resetEquipeMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              {resetEquipeMutation.isPending ? 'Resetando...' : 'Confirmar Reset'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import { FuncionarioInterno, RegistroPontoIntervalo, StatusPonto } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  UtensilsCrossed,
  CheckCircle2,
  LogIn,
  MoreVertical,
  Edit2,
  Trash2,
  User,
  Coffee,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FuncionarioCardProps {
  funcionario: FuncionarioInterno;
  registro?: RegistroPontoIntervalo;
  onCheckin: (funcionario: FuncionarioInterno) => void;
  onSaidaJanta: (registroId: string) => void;
  onRetornoJanta: (registroId: string, saidaJantaAt: string) => void;
  onEdit: (funcionario: FuncionarioInterno) => void;
  onDelete: (funcionarioId: string) => void;
  onReset?: (funcionario: FuncionarioInterno) => void;
  loading?: boolean;
}

export function FuncionarioCard({
  funcionario,
  registro,
  onCheckin,
  onSaidaJanta,
  onRetornoJanta,
  onEdit,
  onDelete,
  onReset,
  loading = false,
}: FuncionarioCardProps) {
  const status: StatusPonto = registro?.status || 'ausente';
  const [tempoDecorrido, setTempoDecorrido] = useState<string>('00:00');

  // Cronômetro em tempo real quando em janta
  useEffect(() => {
    if (status !== 'em_janta' || !registro?.saida_janta_at) return;

    const calcular = () => {
      const inicio = new Date(registro.saida_janta_at!).getTime();
      const agora = new Date().getTime();
      const diffMs = Math.max(0, agora - inicio);

      const minutos = Math.floor(diffMs / 60000);
      const segundos = Math.floor((diffMs % 60000) / 1000);

      const mm = String(minutos).padStart(2, '0');
      const ss = String(segundos).padStart(2, '0');
      setTempoDecorrido(`${mm}:${ss}`);
    };

    calcular();
    const interval = setInterval(calcular, 1000);
    return () => clearInterval(interval);
  }, [status, registro?.saida_janta_at]);

  const formatHora = (iso?: string | null) => {
    if (!iso) return '--:--';
    const date = new Date(iso);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'trabalhando':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Na Loja / Trabalhando
          </Badge>
        );
      case 'em_janta':
        return (
          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 font-semibold animate-pulse">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Em Janta ({tempoDecorrido})
          </Badge>
        );
      case 'finalizado':
        return (
          <Badge className="bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            Turno Encerrado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground border-border/60 flex items-center gap-1 font-normal">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Ausente / Não Chegou
          </Badge>
        );
    }
  };

  const isJantaConcluida = !!registro?.saida_janta_at && !!registro?.retorno_janta_at;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between relative overflow-hidden bg-card/60 backdrop-blur-sm shadow-sm hover:shadow-md ${
        status === 'em_janta'
          ? 'border-amber-500/50 bg-amber-950/10 ring-1 ring-amber-500/30'
          : status === 'trabalhando'
          ? 'border-emerald-500/30'
          : 'border-border/60 hover:border-border'
      }`}
    >
      {/* Topo do Card */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
                status === 'em_janta'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : status === 'trabalhando'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-secondary text-muted-foreground border border-border'
              }`}
            >
              {funcionario.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground leading-tight tracking-tight">
                {funcionario.nome}
              </h3>
              <p className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {funcionario.cargo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-popover border-border">
                <DropdownMenuItem onClick={() => onEdit(funcionario)} className="cursor-pointer gap-2">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  Editar Dados
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onReset?.(funcionario)}
                  className="cursor-pointer text-amber-400 focus:text-amber-300 gap-2"
                >
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  Resetar Dia
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(funcionario.id)}
                  className="cursor-pointer text-destructive focus:text-destructive gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-4">{getStatusBadge()}</div>

        {/* Resumo de Horários */}
        <div className="grid grid-cols-3 gap-2 bg-background/50 border border-border/50 rounded-xl p-3 mb-4 text-center">
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Chegada
            </span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">
              {formatHora(registro?.checkin_at)}
            </span>
          </div>
          <div className="border-x border-border/40">
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Janta
            </span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">
              {formatHora(registro?.saida_janta_at)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
              Retorno
            </span>
            <span className="text-xs font-bold text-foreground mt-0.5 block">
              {formatHora(registro?.retorno_janta_at)}
            </span>
          </div>
        </div>

        {/* Informação do tempo total de janta realizada */}
        {isJantaConcluida && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Tempo de Janta:
            </span>
            <span className="font-bold text-emerald-300">
              {registro?.tempo_total_janta_minutos || 0} min
            </span>
          </div>
        )}
      </div>

      {/* Ações Rápidas (1 Toque) */}
      <div className="pt-2 border-t border-border/40">
        {status === 'ausente' && (
          <Button
            onClick={() => onCheckin(funcionario)}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 h-11 rounded-xl"
          >
            <LogIn className="w-4 h-4" />
            Cheguei (Check-in)
          </Button>
        )}

        {status === 'trabalhando' && !registro?.saida_janta_at && (
          <Button
            onClick={() => registro && onSaidaJanta(registro.id)}
            disabled={loading || !registro}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 h-11 rounded-xl"
          >
            <UtensilsCrossed className="w-4 h-4" />
            Sair para Janta
          </Button>
        )}

        {status === 'em_janta' && (
          <Button
            onClick={() => registro && onRetornoJanta(registro.id, registro.saida_janta_at!)}
            disabled={loading || !registro}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 h-11 rounded-xl animate-pulse"
          >
            <CheckCircle2 className="w-4 h-4" />
            Retornar da Janta ({tempoDecorrido})
          </Button>
        )}

        {status === 'trabalhando' && isJantaConcluida && (
          <div className="text-center py-2 px-3 bg-muted/40 rounded-xl border border-border/40 text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Intervalo Concluído Hoje
          </div>
        )}

        {status === 'finalizado' && (
          <div className="text-center py-2 px-3 bg-muted/40 rounded-xl border border-border/40 text-xs font-medium text-muted-foreground">
            Turno finalizado no reset
          </div>
        )}
      </div>
    </div>
  );
}

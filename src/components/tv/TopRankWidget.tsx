import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchEntregadores, Unidade, Entregador } from '@/lib/api';
import { Trophy, Zap, Star, Package, Clock, Bike, User } from 'lucide-react';

interface TopRankWidgetProps {
    unidadeId: string;
    availableQueue?: Entregador[];
    deliveringQueue?: Entregador[];
    lastCalled?: Entregador | null;
}

export function TopRankWidget({ unidadeId, availableQueue = [], deliveringQueue = [], lastCalled }: TopRankWidgetProps) {
    // 1. Pegar período de expediente (Dia contábil de 12:00 até 11:59 do dia seguinte)
    const getExpedientePeriod = () => {
        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (now.getHours() < 12) {
            start.setDate(start.getDate() - 1);
            start.setHours(12, 0, 0, 0);
            end.setHours(11, 59, 59, 999);
        } else {
            start.setHours(12, 0, 0, 0);
            end.setDate(end.getDate() + 1);
            end.setHours(11, 59, 59, 999);
        }

        return { dataInicio: start, dataFim: end };
    };

    const { dataInicio, dataFim } = getExpedientePeriod();

    // 2. Fetch de Entregadores Válidos
    const { data: entregadores = [] } = useQuery({
        queryKey: ['entregadores', unidadeId, 'top_rank'],
        queryFn: () => fetchEntregadores({ unidade: unidadeId as Unidade }),
        refetchInterval: 30000,
    });

    // 3. Obter histórico do expediente
    const { data: historico = [] } = useQuery({
        queryKey: ['historico-rank-widget', unidadeId, dataInicio.toISOString()],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('historico_entregas')
                .select('entregador_id, hora_saida, hora_retorno, created_at')
                .eq('unidade', unidadeId)
                .gte('hora_saida', dataInicio.toISOString())
                .lte('hora_saida', dataFim.toISOString());

            if (error) throw error;
            return data;
        },
        refetchInterval: 30000,
    });

    // 4. Calcular Top 5
    type RankItem = {
        nome: string;
        saidas: number;
        entregas: number;
        fastestMin: number | null;
    };

    const rankList = (): RankItem[] => {
        const mapa: Record<string, RankItem> = {};

        entregadores.forEach((e) => {
            if (!e.ativo) return;
            mapa[e.id] = {
                nome: e.nome,
                saidas: 0,
                entregas: 0,
                fastestMin: null,
            };
        });

        historico.forEach((h) => {
            const item = mapa[h.entregador_id];
            if (!item) return;

            item.saidas += 1;

            if (h.hora_saida && h.hora_retorno) {
                item.entregas += 1;
                const outTime = new Date(h.hora_saida).getTime();
                const inTime = new Date(h.hora_retorno).getTime();
                const diffMins = Math.round((inTime - outTime) / 60000);

                if (item.fastestMin === null || diffMins < item.fastestMin) {
                    item.fastestMin = diffMins;
                }
            }
        });

        const lista = Object.values(mapa).filter(m => m.saidas > 0);
        lista.sort((a, b) => b.saidas - a.saidas || b.entregas - a.entregas);
        return lista.slice(0, 5);
    };

    const top5 = rankList();

    const medals = [
        { cor: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', glow: 'shadow-yellow-400/20' },
        { cor: 'text-gray-300', bg: 'bg-gray-300/10', border: 'border-gray-300/30', glow: 'shadow-gray-300/20' },
        { cor: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/30', glow: 'shadow-amber-600/20' },
        { cor: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', glow: 'shadow-emerald-400/20' },
        { cor: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', glow: 'shadow-blue-400/20' },
    ];

    const nextInQueue = availableQueue[0];

    const getCreativeSubtitle = (motoboy: RankItem, index: number) => {
        if (motoboy.fastestMin !== null) {
            if (index === 0) return `Lenda da Pista • recorde de ${motoboy.fastestMin} min`;
            if (index === 1) return `Cão de Caça • ${motoboy.fastestMin} min na pista`;
            if (index === 2) return `Velocista Nato • cravou ${motoboy.fastestMin} min`;
            if (index === 3) return `Voando Baixo • ${motoboy.fastestMin} min`;
            return `Piloto Fuga • ${motoboy.fastestMin} min num pedido`;
        } else {
            if (index === 0) return 'Máquina Imbatível nas ruas hoje';
            if (index === 1) return 'O Terror da concorrência na pista';
            if (index === 2) return 'Dominando o asfalto';
            if (index === 3) return 'Inimigo do tempo ocioso';
            return 'Trabalhando em ritmo de máquina';
        }
    };

    return (
        <div className="w-full h-full bg-slate-950 flex text-slate-50 relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[60%] bg-primary/15 blur-[150px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[20%] w-[45%] h-[50%] bg-yellow-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute top-[10%] right-[-5%] w-[30%] h-[40%] bg-emerald-500/8 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />

            {/* ===== COLUNA ESQUERDA: TOP RANK ===== */}
            <div className="flex-1 flex flex-col px-8 py-10 z-10 overflow-hidden">
                {/* Título */}
                <div className="flex items-center gap-4 mb-8 animate-fade-in-down">
                    <Trophy className="w-12 h-12 text-yellow-400 animate-pulse flex-shrink-0" />
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                            Top Entregadores
                        </h1>
                        <p className="text-muted-foreground font-mono text-base mt-1 tracking-widest uppercase opacity-70">
                            Desempenho de Hoje
                        </p>
                    </div>
                </div>

                {/* Lista de Rank */}
                <div className="flex flex-col gap-3 flex-1 overflow-hidden">
                    {top5.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-slate-500 text-xl font-light">
                            Aguardando primeiras entregas do dia...
                        </div>
                    ) : (
                        top5.map((motoboy, index) => {
                            const visual = medals[index] || medals[4];
                            return (
                                <div
                                    key={motoboy.nome}
                                    className={`flex items-center justify-between px-5 py-3.5 rounded-2xl border ${visual.border} ${visual.bg} backdrop-blur-md shadow-lg ${visual.glow} transition-all duration-700 animate-slide-in-right`}
                                    style={{ animationDelay: `${index * 120}ms`, animationFillMode: 'both' }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`text-3xl font-mono font-black ${visual.cor} w-10 text-center drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex-shrink-0`}>
                                            #{index + 1}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-2xl font-bold tracking-tight text-white truncate">{motoboy.nome}</span>
                                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 uppercase tracking-wide mt-0.5 truncate">
                                                {motoboy.fastestMin !== null ? <Zap className="w-3 h-3 text-emerald-400 flex-shrink-0" /> : <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
                                                {getCreativeSubtitle(motoboy, index)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`flex flex-col items-end flex-shrink-0 ml-4`}>
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Saídas</span>
                                        <span className={`text-4xl font-mono font-black ${visual.cor}`}>{motoboy.saidas}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Rodapé */}
                <div className="flex justify-start mt-6">
                    <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                        <p className="text-slate-400 font-mono text-xs flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Ranking ao vivo · Atualizado a cada 30s
                        </p>
                    </div>
                </div>
            </div>

            {/* Divisor vertical */}
            <div className="w-px bg-white/8 self-stretch my-8 flex-shrink-0" />

            {/* ===== COLUNA DIREITA: STATUS DA FILA ===== */}
            <div className="w-[340px] flex-shrink-0 flex flex-col gap-4 px-6 py-10 z-10 overflow-hidden">

                {/* ---- PRÓXIMO DA FILA ---- */}
                <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Próximo a Ser Chamado
                    </p>
                    {nextInQueue ? (
                        <div className="bg-primary/10 border border-primary/30 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg animate-slide-in-right">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xl font-black text-primary font-mono">1</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-bold text-white truncate">{nextInQueue.nome}</p>
                                <p className="text-xs text-primary/80 font-mono mt-0.5">Na fila · aguardando</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-slate-500 text-sm font-medium">
                            Fila vazia
                        </div>
                    )}
                </div>

                {/* ---- FILA DISPONÍVEL (demais) ---- */}
                {availableQueue.length > 1 && (
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            Fila de Espera ({availableQueue.length - 1})
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {availableQueue.slice(1).map((e, i) => (
                                <div key={e.id} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5">
                                    <span className="text-sm font-bold text-slate-400 font-mono w-5 text-center">{i + 2}</span>
                                    <span className="text-sm font-semibold text-slate-200 truncate">{e.nome}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ---- EM ENTREGA / PISTA ---- */}
                {deliveringQueue.length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Bike className="w-3.5 h-3.5" />
                            Em Pista ({deliveringQueue.length})
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {deliveringQueue.map((e, i) => (
                                <div key={e.id} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                                    <span className="text-sm font-semibold text-emerald-200 truncate">{e.nome}</span>
                                    {e.tipo_bag && (
                                        <Package className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0 ml-auto" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ---- ÚLTIMO CHAMADO ---- */}
                {lastCalled && (
                    <div className="mt-auto">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            Último Chamado
                        </p>
                        <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-lg">
                            <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
                            <div className="min-w-0">
                                <p className="text-lg font-bold text-amber-200 truncate">{lastCalled.nome}</p>
                                <p className="text-xs text-amber-500/80 font-mono">Chamado recentemente</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
        </div>
    );
}

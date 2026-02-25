import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HORARIO_EXPEDIENTE, fetchEntregadores, Unidade } from '@/lib/api';
import { Trophy, Medal, Star, Target, Zap } from 'lucide-react';

interface TopRankWidgetProps {
    unidadeId: string;
}

export function TopRankWidget({ unidadeId }: TopRankWidgetProps) {
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

    // 3. Obter Métrica Avançada do Analytics Local (Copiamos da lógica do Dashboard, isolado)
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
        refetchInterval: 30000, // Atualiza de 30s em 30s
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

        // Sort primário por saídas, desempate por entrega
        lista.sort((a, b) => b.saidas - a.saidas || b.entregas - a.entregas);

        return lista.slice(0, 5); // Pega top 5
    };

    const top5 = rankList();

    const medals = [
        { cor: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
        { cor: 'text-gray-300', bg: 'bg-gray-300/10', border: 'border-gray-300/30' },
        { cor: 'text-amber-600', bg: 'bg-amber-600/10', border: 'border-amber-600/30' },
        { cor: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
        { cor: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' }
    ];

    return (
        <div className="w-full h-full bg-slate-950 flex flex-col pt-12 text-slate-50 items-center justify-center relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

            <div className="flex items-center gap-4 mb-16 z-10 animate-fade-in-down">
                <Trophy className="w-16 h-16 text-yellow-400 animate-pulse" />
                <div>
                    <h1 className="text-5xl font-black uppercase tracking-tight bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                        Top 5 Entregadores
                    </h1>
                    <p className="text-muted-foreground font-mono text-xl mt-2 tracking-widest text-center opacity-80 uppercase">
                        Desempenho de Hoje
                    </p>
                </div>
            </div>

            <div className="w-full max-w-5xl z-10 flex flex-col gap-4 px-8">
                {top5.length === 0 ? (
                    <div className="text-center text-slate-500 mt-20 text-2xl font-light">
                        Aguardando primeiras entregas do dia...
                    </div>
                ) : (
                    top5.map((motoboy, index) => {
                        const visual = medals[index] || medals[4];
                        return (
                            <div
                                key={motoboy.nome}
                                className={`flex items-center justify-between p-6 rounded-2xl border ${visual.border} ${visual.bg} backdrop-blur-md shadow-2xl transition-all duration-700 animate-slide-in-right hover:scale-[1.02]`}
                                style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'both' }}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={`text-4xl font-mono font-black ${visual.cor} w-12 text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]`}>
                                        #{index + 1}
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-3xl font-bold tracking-tight text-white">{motoboy.nome}</span>
                                        {motoboy.fastestMin !== null && (
                                            <span className="text-sm font-medium text-slate-400 flex items-center gap-1 mt-1">
                                                <Zap className="w-4 h-4 text-emerald-400" />
                                                Recorde: {motoboy.fastestMin} min / entrega
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="flex flex-col items-end border-r border-white/10 pr-8">
                                        <span className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Entregas</span>
                                        <span className="text-3xl font-mono font-black text-slate-300">{motoboy.entregas}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm text-slate-400 uppercase font-bold tracking-wider mb-1">Saídas</span>
                                        <div className="flex items-center gap-2">
                                            <Target className={`w-6 h-6 ${visual.cor}`} />
                                            <span className={`text-5xl font-mono font-black ${visual.cor}`}>{motoboy.saidas}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Rodapé Animado */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                <div className="px-6 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm shadow-xl">
                    <p className="text-slate-400 font-mono text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Ranking ao vivo • Atualizado a cada 30 segundos
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
        </div>
    );
}

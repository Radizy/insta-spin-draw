import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';
import { Package, Clock, TrendingUp, Trophy, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

type PeriodType = 'hoje' | '7d' | '30d' | 'all';

interface MetricResult {
    total_entregas: number;
    tempo_medio: number;
    ranking_motoboys: { nome: string; total_entregas: number; tempo_medio: number }[];
    performance_bag: { tipo_bag: string; total: number; tempo_medio: number }[];
    entregas_por_hora: { hora: number; total: number }[];
    entregas_por_dia: { dia: string; total: number }[];
}

export function AnalyticsDashboard() {
    const { user } = useAuth();
    const [periodo, setPeriodo] = useState<PeriodType>('7d');

    // Calcula datas de início e fim baseadas no período selecionado
    const dateRange = useMemo(() => {
        const end = endOfDay(new Date());
        let start = new Date();

        switch (periodo) {
            case 'hoje':
                start = startOfDay(new Date());
                break;
            case '7d':
                start = startOfDay(subDays(new Date(), 7));
                break;
            case '30d':
                start = startOfDay(subDays(new Date(), 30));
                break;
            case 'all':
                start = new Date(2000, 0, 1); // Uma data bem antiga
                break;
        }

        return { start: start.toISOString(), end: end.toISOString() };
    }, [periodo]);

    const { data: metrics, isLoading, isError } = useQuery({
        queryKey: ['analytics_pro_metrics', user?.unidade, dateRange],
        queryFn: async () => {
            if (!user?.unidade) throw new Error('Unidade não encontrada');

            const { data, error } = await supabase.rpc('get_analytics_pro_metrics', {
                p_unidade_nome: user.unidade,
                p_data_inicio: dateRange.start,
                p_data_fim: dateRange.end,
            });

            if (error) {
                console.error('Erro na RPC Analytics:', error);
                throw error;
            }

            return data as unknown as MetricResult;
        },
        enabled: !!user?.unidade,
        staleTime: 5 * 60 * 1000, // 5 minutos de cache
    });

    if (isError) {
        return (
            <div className="flex justify-center items-center h-48 text-red-500">
                Erro ao carregar os dados. Tente novamente mais tarde.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            {/* Header e Filtro */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Estatísticas da Loja</h2>
                    <p className="text-muted-foreground text-sm">
                        Métricas de performance isoladas para <b>{user?.unidade}</b>
                    </p>
                </div>

                <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodType)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="hoje">Hoje</SelectItem>
                        <SelectItem value="7d">Últimos 7 dias</SelectItem>
                        <SelectItem value="30d">Últimos 30 dias</SelectItem>
                        <SelectItem value="all">Todo o período</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : !metrics || metrics.total_entregas === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-dashed">
                    <Package className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">Nenhuma entrega registrada</h3>
                    <p className="text-muted-foreground text-sm">
                        Não encontramos dados para o período selecionado.
                    </p>
                </div>
            ) : (
                <>
                    {/* Cards Resumo */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.total_entregas}</div>
                                <p className="text-xs text-muted-foreground">no período selecionado</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{metrics.tempo_medio} min</div>
                                <p className="text-xs text-muted-foreground">da saída ao retorno</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Melhor Motoboy</CardTitle>
                                <Trophy className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate">
                                    {metrics.ranking_motoboys[0]?.nome || '-'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {metrics.ranking_motoboys[0]?.total_entregas || 0} entregas
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Volume Diário Típico</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {Math.round(metrics.total_entregas / (periodo === 'hoje' ? 1 : periodo === '7d' ? 7 : 30))}
                                </div>
                                <p className="text-xs text-muted-foreground">média por dia</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Gráfico: Entregas por Hora */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Entregas por Hora</CardTitle>
                                <CardDescription>Fluxo de saída ao longo do dia</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={metrics.entregas_por_hora}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                                        <XAxis
                                            dataKey="hora"
                                            tickFormatter={(h) => `${h}h`}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            formatter={(val: number) => [`${val} entregas`, 'Volume']}
                                            labelFormatter={(l) => `${l}:00`}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="hsl(var(--primary))"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: "hsl(var(--primary))" }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Gráfico: Performance de Bag */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Uso de Bags</CardTitle>
                                <CardDescription>Volume distribuído por tipo de entrega</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.performance_bag} layout="vertical" margin={{ left: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                                        <XAxis type="number" axisLine={false} tickLine={false} />
                                        <YAxis
                                            dataKey="tipo_bag"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            width={100}
                                        />
                                        <Tooltip formatter={(val: number) => [`${val} entregas`, 'Volume']} />
                                        <Bar
                                            dataKey="total"
                                            fill="hsl(var(--primary))"
                                            radius={[0, 4, 4, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ranking Top 10 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top 10 Motoboys</CardTitle>
                            <CardDescription>Rankeamento pelo maior volume de entregas</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {metrics.ranking_motoboys.map((m, i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="w-8 font-bold text-muted-foreground flex justify-center">{i + 1}º</div>
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-4">
                                            {m.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">{m.nome}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Média de {m.tempo_medio} minutos por entrega
                                            </p>
                                        </div>
                                        <div className="font-medium text-lg">
                                            {m.total_entregas}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

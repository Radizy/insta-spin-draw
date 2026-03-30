import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    fetchEntregadores,
    fetchMaquininhas,
    fetchActiveVinculos,
    atrelarMaquininha,
    devolverMaquininha,
    Entregador,
    Maquininha,
    MaquininhaVinculo
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { toast } from 'sonner';
import { Loader2, CreditCard, UserCheck, ArrowRightLeft, Clock, CheckCircle2, History, Search, XCircle } from 'lucide-react';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { Input } from '@/components/ui/input';

interface MaquininhaControlModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MaquininhaControlModal({ open, onOpenChange }: MaquininhaControlModalProps) {
    const { user } = useAuth();
    const { selectedUnit } = useUnit();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('atrelar');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMotoboyId, setSelectedMotoboyId] = useState<string | null>(null);

    // Queries
    const { data: entregadores = [], isLoading: isLoadingEntregadores } = useQuery({
        queryKey: ['entregadores-maquininhas', selectedUnit],
        queryFn: () => fetchEntregadores({ unidade: selectedUnit, unidade_id: user?.unidadeId, ativo: true }),
        enabled: open && !!selectedUnit
    });

    const { data: maquininhas = [], isLoading: isLoadingMachines } = useQuery({
        queryKey: ['maquininhas', user?.unidadeId],
        queryFn: () => fetchMaquininhas(user!.unidadeId!),
        enabled: open && !!user?.unidadeId
    });

    const { data: vinculosAtivos = [], isLoading: isLoadingVinculos } = useQuery({
        queryKey: ['vinculos-ativos', user?.unidadeId],
        queryFn: () => fetchActiveVinculos(user!.unidadeId!),
        enabled: open && !!user?.unidadeId,
        refetchInterval: 10000 // Atualiza a cada 10s para ver o tempo real
    });

    // Mutations
    const atrelarMutation = useMutation({
        mutationFn: atrelarMaquininha,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maquininhas'] });
            queryClient.invalidateQueries({ queryKey: ['vinculos-ativos'] });
            toast.success('Maquininha atrelada com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atrelar maquininha: ' + error.message);
        }
    });

    const devolverMutation = useMutation({
        mutationFn: devolverMaquininha,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maquininhas'] });
            queryClient.invalidateQueries({ queryKey: ['vinculos-ativos'] });
            toast.success('Maquininha devolvida com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao devolver maquininha: ' + error.message);
        }
    });

    // Filtros
    const hoje = new Date().toISOString().split('T')[0];

    const motoboysElegiveis = entregadores.filter(e => {
        const isAtivo = e.ativo;
        const hasActiveMachine = vinculosAtivos.some(v => v.motoboy_id === e.id);
        const matchesSearch = e.nome.toLowerCase().includes(searchTerm.toLowerCase());
        return isAtivo && !hasActiveMachine && matchesSearch;
    });

    const maquininhasLivres = maquininhas.filter(m => {
        const isLivre = m.status === 'livre' && m.ativo;
        const matchesSearch = m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.numero_serie && m.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()));
        return isLivre && matchesSearch;
    });

    const vinculosFiltrados = vinculosAtivos.filter(v => {
        const matchesSearch = v.entregador?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.maquininha?.nome.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const formatUsageTime = (startTime: string) => {
        const now = new Date();
        const start = new Date(startTime);
        const minutes = differenceInMinutes(now, start);
        const seconds = differenceInSeconds(now, start) % 60;

        if (minutes > 60) {
            const hours = Math.floor(minutes / 60);
            return `${hours}h ${minutes % 60}m`;
        }
        return `${minutes}m ${seconds}s`;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl sm:max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-border/50">
                <DialogHeader className="p-6 pb-2 border-b border-border/10 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                            <CreditCard className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold tracking-tight">Controle de Maquininhas</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-primary/60">
                                Gerencie a distribuição de equipamentos
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs
                    defaultValue="atrelar"
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 flex flex-col min-h-0"
                >
                    <div className="px-6 py-2 bg-muted/30 border-b border-border/5 shrink-0">
                        <TabsList className="grid w-full grid-cols-2 bg-secondary/50 p-1 rounded-lg">
                            <TabsTrigger
                                value="atrelar"
                                className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all py-2"
                            >
                                <UserCheck className="w-4 h-4" />
                                Atrelar
                            </TabsTrigger>
                            <TabsTrigger
                                value="devolver"
                                className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all py-2"
                            >
                                <History className="w-4 h-4" />
                                Devolver
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0 p-6 overflow-hidden">
                        {/* Search Bar */}
                        <div className="mb-6 relative shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder={activeTab === 'atrelar' ? "Pesquisar motoboy ou maquininha..." : "Pesquisar por entregador ou máquina..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-11 bg-muted/20 border-border/50 rounded-xl focus:ring-primary/20"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <TabsContent value="atrelar" className="flex-1 min-h-0 flex flex-col m-0 animate-in fade-in slide-in-from-bottom-2 duration-300 data-[state=inactive]:hidden">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
                                {/* Coluna Motoboys */}
                                <div className="flex flex-col min-h-0 gap-4">
                                    <div className="flex items-center justify-between shrink-0">
                                        <Label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                            Motoboys Elegíveis
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
                                                {motoboysElegiveis.length}
                                            </span>
                                        </Label>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 pb-4">
                                        {isLoadingEntregadores ? (
                                            <div className="flex items-center justify-center h-48 bg-muted/10 rounded-xl border border-dashed border-border/50">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                                            </div>
                                        ) : motoboysElegiveis.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-8 h-48 bg-muted/5 rounded-xl border border-dashed border-border/50 text-center space-y-2">
                                                <div className="p-3 bg-muted/20 rounded-full">
                                                    <UserCheck className="w-6 h-6 text-muted-foreground/50" />
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium">Nenhum motoboy disponível agora</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-2">
                                                {motoboysElegiveis.map(motoboy => (
                                                    <button
                                                        key={motoboy.id}
                                                        onClick={() => setSelectedMotoboyId(selectedMotoboyId === motoboy.id ? null : motoboy.id)}
                                                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer group ${selectedMotoboyId === motoboy.id
                                                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                                            : 'border-border/50 bg-card/50 hover:bg-muted/50'
                                                            }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className={`font-semibold text-sm transition-colors ${selectedMotoboyId === motoboy.id ? 'text-primary' : 'group-hover:text-primary'}`}>{motoboy.nome}</span>
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] text-muted-foreground">Check-in</span>
                                                                <span className={`text-[11px] font-mono font-bold ${selectedMotoboyId === motoboy.id ? 'text-primary' : 'text-primary/70'}`}>
                                                                    {motoboy.primeiro_checkin ? format(new Date(motoboy.primeiro_checkin), 'HH:mm') : motoboy.fila_posicao ? format(new Date(motoboy.fila_posicao), 'HH:mm') : '--:--'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Coluna Maquininhas */}
                                <div className="flex flex-col min-h-0 gap-4">
                                    <div className="flex items-center justify-between shrink-0">
                                        <Label className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                            Maquininhas Livres
                                            <span className="bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full text-[10px]">
                                                {maquininhasLivres.length}
                                            </span>
                                        </Label>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 pb-4">
                                        {isLoadingMachines ? (
                                            <div className="flex items-center justify-center h-48 bg-muted/10 rounded-xl border border-dashed border-border/50">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                                            </div>
                                        ) : maquininhasLivres.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-8 h-48 bg-muted/5 rounded-xl border border-dashed border-border/50 text-center space-y-2">
                                                <div className="p-3 bg-muted/20 rounded-full">
                                                    <CreditCard className="w-6 h-6 text-muted-foreground/50" />
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium">Sem maquininhas livres</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {maquininhasLivres.map(machine => (
                                                    <div
                                                        key={machine.id}
                                                        className={`p-4 rounded-xl border transition-all group relative overflow-hidden ${selectedMotoboyId ? 'border-primary/30 shadow-sm' : 'border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-primary/5 rounded-full" />
                                                        <div className="flex flex-col gap-3 relative z-10 w-full">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-bold text-base group-hover:text-primary transition-colors">{machine.nome}</p>
                                                                    <p className="text-xs text-muted-foreground font-mono">{machine.numero_serie || 'S/N'}</p>
                                                                </div>
                                                                <Button
                                                                    size="sm"
                                                                    variant={selectedMotoboyId ? "default" : "secondary"}
                                                                    disabled={!selectedMotoboyId}
                                                                    className={`h-9 px-4 rounded-lg font-medium transition-all ${!selectedMotoboyId ? 'opacity-50' : 'shadow-md shadow-primary/20'}`}
                                                                    onClick={() => {
                                                                        if (!selectedMotoboyId) return;
                                                                        const motoboy = motoboysElegiveis.find(m => m.id === selectedMotoboyId);
                                                                        if (!motoboy) return;
                                                                        atrelarMutation.mutate({
                                                                            motoboy_id: motoboy.id,
                                                                            maquininha_id: machine.id,
                                                                            unidade_id: user!.unidadeId!,
                                                                            franquia_id: user!.franquiaId!,
                                                                            horario_checkin: motoboy.primeiro_checkin || motoboy.fila_posicao || new Date().toISOString(),
                                                                            unidade_nome: selectedUnit,
                                                                            motoboy_nome: motoboy.nome,
                                                                            maquininha_nome: machine.nome
                                                                        });
                                                                        setSelectedMotoboyId(null);
                                                                    }}
                                                                >
                                                                    {selectedMotoboyId ? 'Atrelar' : 'Selecione um motoboy...'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="devolver" className="flex-1 min-h-0 flex flex-col m-0 animate-in fade-in slide-in-from-bottom-2 duration-300 data-[state=inactive]:hidden">
                            <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 pb-4 space-y-4">
                                {isLoadingVinculos ? (
                                    <div className="flex items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : vinculosAtivos.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                        <div className="p-6 bg-muted/10 rounded-full">
                                            <CheckCircle2 className="w-12 h-12 text-muted-foreground/30" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-lg font-bold text-muted-foreground">Tudo em ordem!</p>
                                            <p className="text-sm text-muted-foreground/60 max-w-[250px]">Nenhuma maquininha em uso no momento.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {vinculosFiltrados.map(vinculo => (
                                            <div
                                                key={vinculo.id}
                                                className="p-5 rounded-2xl border border-border/50 bg-card hover:border-primary/20 transition-all shadow-sm group overflow-hidden relative"
                                            >
                                                <div className="absolute top-0 right-0 h-full w-1 bg-primary/20" />
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 transition-colors group-hover:bg-primary/10">
                                                            <CreditCard className="w-7 h-7 text-primary" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xl font-black tracking-tight text-foreground/90">{vinculo.maquininha?.nome}</p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                                <p className="text-sm font-bold text-primary/80 uppercase tracking-wide">{vinculo.entregador?.nome}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-8">
                                                        <div className="flex flex-col items-center sm:items-end justify-center px-4 py-2 bg-muted/30 rounded-xl border border-border/5">
                                                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span className="text-[10px] font-bold uppercase tracking-widest">Em uso há</span>
                                                            </div>
                                                            <span className="text-lg font-black font-mono text-primary tabular-nums">
                                                                {formatUsageTime(vinculo.horario_retirada)}
                                                            </span>
                                                        </div>

                                                        <Button
                                                            variant="default"
                                                            size="lg"
                                                            className="h-14 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 gap-3"
                                                            disabled={devolverMutation.isPending}
                                                            onClick={() => {
                                                                devolverMutation.mutate({
                                                                    vinculo_id: vinculo.id,
                                                                    maquininha_id: vinculo.maquininha_id,
                                                                    unidade_id: user!.unidadeId!,
                                                                    unidade_nome: selectedUnit,
                                                                    motoboy_nome: vinculo.entregador?.nome || '',
                                                                    maquininha_nome: vinculo.maquininha?.nome || ''
                                                                });
                                                            }}
                                                        >
                                                            {devolverMutation.isPending ? (
                                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                            ) : (
                                                                <ArrowRightLeft className="w-5 h-5 rotate-90 sm:rotate-0" />
                                                            )}
                                                            Dar Baixa
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}



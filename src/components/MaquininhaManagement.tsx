import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Smartphone, Hash, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchMaquininhas, createMaquininha, updateMaquininha, deleteMaquininha, Maquininha } from '@/lib/api';

export function MaquininhaManagement() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState<Maquininha | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState({
        nome: '',
        numero_serie: '',
    });

    const { data: maquininhas = [], isLoading } = useQuery({
        queryKey: ['maquininhas-management', user?.unidadeId],
        queryFn: () => fetchMaquininhas(user?.unidadeId || '', false),
        enabled: !!user?.unidadeId,
    });

    const createMutation = useMutation({
        mutationFn: (data: Partial<Maquininha>) => createMaquininha({
            ...data,
            unidade_id: user?.unidadeId,
            franquia_id: user?.franquiaId,
            status: 'livre',
            ativo: true
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maquininhas-management'] });
            toast.success('Maquininha cadastrada com sucesso!');
            closeForm();
        },
        onError: (error: any) => {
            toast.error('Erro ao cadastrar: ' + error.message);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Maquininha> }) =>
            updateMaquininha(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maquininhas-management'] });
            toast.success('Maquininha atualizada!');
            closeForm();
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar: ' + error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteMaquininha(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maquininhas-management'] });
            toast.success('Maquininha removida!');
        },
        onError: (error: any) => {
            toast.error('Erro ao remover: ' + error.message);
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nome.trim()) {
            toast.error('O nome da maquininha é obrigatório');
            return;
        }

        if (editingMachine) {
            updateMutation.mutate({ id: editingMachine.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (machine: Maquininha) => {
        setEditingMachine(machine);
        setFormData({
            nome: machine.nome,
            numero_serie: machine.numero_serie || '',
        });
        setIsFormOpen(true);
    };

    const toggleAtivo = (machine: Maquininha) => {
        updateMutation.mutate({
            id: machine.id,
            data: { ativo: !machine.ativo }
        });
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingMachine(null);
        setFormData({ nome: '', numero_serie: '' });
    };

    const filteredMachines = maquininhas.filter(m =>
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.numero_serie && m.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-primary" />
                            Gerenciamento de Maquininhas
                        </CardTitle>
                        <CardDescription>
                            Cadastre e controle as maquininhas disponíveis para os motoboys.
                        </CardDescription>
                    </div>
                    <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
                                <Plus className="w-4 h-4" />
                                Nova Maquininha
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingMachine ? 'Editar Maquininha' : 'Cadastrar Nova Maquininha'}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nome">Identificação / Nome</Label>
                                    <Input
                                        id="nome"
                                        placeholder="Ex: Maquininha 01, Mercado Pago Amarela"
                                        value={formData.nome}
                                        onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="serial">Número de Série (Opcional)</Label>
                                    <Input
                                        id="serial"
                                        placeholder="S/N ou ID da máquina"
                                        value={formData.numero_serie}
                                        onChange={e => setFormData({ ...formData, numero_serie: e.target.value })}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button type="button" variant="outline" onClick={closeForm}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                        {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {editingMachine ? 'Salvar Alterações' : 'Cadastrar'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="relative mt-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou número de série..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-xl bg-muted/50 animate-pulse" />
                        ))}
                    </div>
                ) : filteredMachines.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl border-muted">
                        <Smartphone className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                        <h3 className="text-lg font-medium">Nenhuma maquininha encontrada</h3>
                        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                            {searchTerm ? 'Tente ajustar sua busca ou cadastrar uma nova máquina.' : 'Comece cadastrando sua primeira maquininha de pagamentos.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredMachines.map((machine) => (
                            <div
                                key={machine.id}
                                className={`group relative flex flex-col p-4 rounded-xl border transition-all hover:shadow-md ${!machine.ativo ? 'bg-muted/30 grayscale opacity-70' : 'bg-card'
                                    }`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`p-2 rounded-lg ${machine.status === 'em_uso' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => handleEdit(machine)}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                            onClick={() => {
                                                if (confirm('Deseja excluir permanentemente esta maquininha?')) {
                                                    deleteMutation.mutate(machine.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <h4 className="font-bold text-base truncate pr-8">{machine.nome}</h4>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1 mb-4">
                                    <Hash className="w-3 h-3" />
                                    <span>{machine.numero_serie || 'Sem S/N'}</span>
                                </div>

                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${machine.status === 'em_uso' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                                        <span className="text-[10px] uppercase font-bold tracking-wider">
                                            {machine.status === 'em_uso' ? 'Em Uso' : 'Livre'}
                                        </span>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-7 text-[10px] gap-1.5 px-2 ${machine.ativo ? 'text-primary' : 'text-muted-foreground'}`}
                                        onClick={() => toggleAtivo(machine)}
                                    >
                                        {machine.ativo ? (
                                            <>
                                                <ToggleRight className="w-4 h-4" />
                                                Ativa
                                            </>
                                        ) : (
                                            <>
                                                <ToggleLeft className="w-4 h-4" />
                                                Inativa
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Plus, Trash2, Edit, Save, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import {
    fetchSystemUpdates,
    createSystemUpdate,
    updateSystemUpdate,
    deleteSystemUpdate,
    SystemUpdate
} from '@/lib/api';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export function SuperAdminUpdates() {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<SystemUpdate>>({});

    const { data: updates = [], isLoading } = useQuery({
        queryKey: ['system_updates_admin'],
        queryFn: fetchSystemUpdates,
    });

    const createMutation = useMutation({
        mutationFn: createSystemUpdate,
        onSuccess: () => {
            toast.success('Atualização criada!');
            queryClient.invalidateQueries({ queryKey: ['system_updates_admin'] });
            queryClient.invalidateQueries({ queryKey: ['system_updates'] });
            setFormData({});
        },
        onError: (err: any) => toast.error(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<SystemUpdate> }) =>
            updateSystemUpdate(id, data),
        onSuccess: () => {
            toast.success('Atualização salva!');
            queryClient.invalidateQueries({ queryKey: ['system_updates_admin'] });
            queryClient.invalidateQueries({ queryKey: ['system_updates'] });
            setEditingId(null);
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteSystemUpdate,
        onSuccess: () => {
            toast.success('Atualização removida!');
            queryClient.invalidateQueries({ queryKey: ['system_updates_admin'] });
            queryClient.invalidateQueries({ queryKey: ['system_updates'] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const handleCreate = () => {
        createMutation.mutate({
            titulo: formData.titulo || 'Nova Atualização',
            tipo: formData.tipo || 'MELHORIAS',
            status: formData.status || 'planejado',
            data_publicacao: formData.data_publicacao || new Date().toISOString().split('T')[0],
            ordem: updates.length,
        });
    };

    const handleSaveEdit = (id: string, currentData: SystemUpdate) => {
        updateMutation.mutate({
            id,
            data: {
                titulo: formData.titulo ?? currentData.titulo,
                tipo: formData.tipo ?? currentData.tipo,
                status: formData.status ?? currentData.status,
                data_publicacao: formData.data_publicacao ?? currentData.data_publicacao,
            }
        });
    };

    const startEdit = (update: SystemUpdate) => {
        setEditingId(update.id);
        setFormData(update);
    };

    const moveOrder = (id: string, direction: 'up' | 'down') => {
        // Busca e troca ordem. Por simplicidade, faremos update sequencial
        const index = updates.findIndex(u => u.id === id);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            const current = updates[index];
            const prev = updates[index - 1];
            updateMutation.mutate({ id: current.id, data: { ordem: prev.ordem } });
            updateMutation.mutate({ id: prev.id, data: { ordem: current.ordem } });
        } else if (direction === 'down' && index < updates.length - 1) {
            const current = updates[index];
            const next = updates[index + 1];
            updateMutation.mutate({ id: current.id, data: { ordem: next.ordem } });
            updateMutation.mutate({ id: next.id, data: { ordem: current.ordem } });
        }
    };

    if (isLoading) return <div>Carregando...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-mono font-semibold flex items-center gap-2">
                    <Bell className="w-5 h-5" /> Gerenciamento de Atualizações
                </h2>
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="w-4 h-4" /> Nova Publicação
                </Button>
            </div>

            <div className="grid gap-4">
                {updates.map((update, idx) => (
                    <Card key={update.id} className="border-border">
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">

                            <div className="flex flex-col gap-1 w-full md:w-auto md:flex-1">
                                {editingId === update.id ? (
                                    <Input
                                        value={formData.titulo || ''}
                                        onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                        className="font-bold text-lg"
                                    />
                                ) : (
                                    <div className="font-bold text-lg">{update.titulo}</div>
                                )}

                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                    {editingId === update.id ? (
                                        <>
                                            <Select
                                                value={formData.tipo}
                                                onValueChange={v => setFormData({ ...formData, tipo: v })}
                                            >
                                                <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="NOVO RECURSO">NOVO RECURSO</SelectItem><SelectItem value="MELHORIAS">MELHORIAS</SelectItem></SelectContent>
                                            </Select>

                                            <Select
                                                value={formData.status}
                                                onValueChange={(v: any) => setFormData({ ...formData, status: v })}
                                            >
                                                <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="lancado">Lançado</SelectItem><SelectItem value="planejado">Planejado</SelectItem></SelectContent>
                                            </Select>

                                            <Input
                                                type="date"
                                                value={formData.data_publicacao || ''}
                                                onChange={e => setFormData({ ...formData, data_publicacao: e.target.value })}
                                                className="w-[150px] h-8 text-xs"
                                            />
                                        </>
                                    ) : (
                                        <>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${update.tipo === 'NOVO RECURSO' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                                                }`}>{update.tipo}</span>

                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${update.status === 'lancado' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                                                }`}>{update.status === 'lancado' ? 'Lançado (Últimas)' : 'Planejado (Futuras)'}</span>

                                            <span className="text-xs text-muted-foreground">{update.data_publicacao}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 w-full md:w-auto">
                                <Button size="icon" variant="ghost" onClick={() => moveOrder(update.id, 'up')} disabled={idx === 0 || editingId !== null}>
                                    <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => moveOrder(update.id, 'down')} disabled={idx === updates.length - 1 || editingId !== null}>
                                    <ArrowDown className="w-4 h-4" />
                                </Button>

                                {editingId === update.id ? (
                                    <Button size="sm" onClick={() => handleSaveEdit(update.id, update)} className="bg-emerald-600 hover:bg-emerald-700">
                                        <Save className="w-4 h-4 mr-1" /> Salvar
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="secondary" onClick={() => startEdit(update)}>
                                        <Edit className="w-4 h-4 mr-1" /> Editar
                                    </Button>
                                )}

                                <Button size="icon" variant="destructive" onClick={() => deleteMutation.mutate(update.id)}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

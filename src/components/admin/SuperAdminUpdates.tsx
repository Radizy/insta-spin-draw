import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Plus, Trash2, Edit, Save, GripVertical } from 'lucide-react';
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
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const COLUMNS = [
    { id: 'ideia_enviada', title: 'Ideias Enviadas' },
    { id: 'em_desenvolvimento', title: 'Em Desenvolvimento' },
    { id: 'lancado', title: 'Lançados' }
] as const;

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
            status: formData.status || 'ideia_enviada',
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
        toast.success('Atualização salva!');
    };

    const startEdit = (update: SystemUpdate) => {
        setEditingId(update.id);
        setFormData(update);
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // Se moveu para outra coluna, atualiza o status
        if (source.droppableId !== destination.droppableId) {
            updateMutation.mutate({
                id: draggableId,
                data: { status: destination.droppableId as any }
            });
            toast.success('Status atualizado!');
        } else {
            // Reordenar (Opcional, mas como implementamos updateSystemUpdate, vamos apenas focar nas colunas por enquanto 
            // já que a listagem baseada em ordem pode ser mais complexa se quisermos order dentro da coluna.
            // Para manter simples e funcional:
            // return;
        }
    };

    if (isLoading) return <div>Carregando...</div>;

    // Organizar por colunas, e tratar 'planejado' como 'em_desenvolvimento' caso haja dados legados
    const columnData = {
        ideia_enviada: updates.filter(u => u.status === 'ideia_enviada'),
        em_desenvolvimento: updates.filter(u => u.status === 'em_desenvolvimento' || u.status === 'planejado'),
        lancado: updates.filter(u => u.status === 'lancado'),
    };

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

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {COLUMNS.map(col => (
                        <div key={col.id} className="flex-1 w-full bg-card/50 border border-border rounded-xl p-4 min-h-[500px]">
                            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center justify-between">
                                {col.title}
                                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs">
                                    {columnData[col.id].length}
                                </span>
                            </h3>

                            <Droppable droppableId={col.id}>
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="space-y-3 min-h-[400px]"
                                    >
                                        {columnData[col.id].map((update, idx) => (
                                            <Draggable key={update.id} draggableId={update.id} index={idx}>
                                                {(provided, snapshot) => (
                                                    <Card
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`border-border shadow-sm transform transition-all ${snapshot.isDragging ? 'rotate-2 scale-[1.02] shadow-xl z-50 ring-2 ring-primary' : ''}`}
                                                    >
                                                        <CardContent className="p-3">
                                                            <div className="flex items-start gap-2">
                                                                <div 
                                                                    {...provided.dragHandleProps}
                                                                    className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <GripVertical className="w-4 h-4" />
                                                                </div>
                                                                
                                                                <div className="flex-1 min-w-0">
                                                                    {editingId === update.id ? (
                                                                        <div className="space-y-2 mb-2">
                                                                            <Input
                                                                                value={formData.titulo || ''}
                                                                                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                                                                className="font-bold text-sm h-8"
                                                                                placeholder="Título"
                                                                            />
                                                                            <div className="flex flex-col gap-2">
                                                                                <Select
                                                                                    value={formData.tipo}
                                                                                    onValueChange={v => setFormData({ ...formData, tipo: v })}
                                                                                >
                                                                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                                    <SelectContent>
                                                                                        <SelectItem value="NOVO RECURSO">NOVO RECURSO</SelectItem>
                                                                                        <SelectItem value="MELHORIAS">MELHORIAS</SelectItem>
                                                                                    </SelectContent>
                                                                                </Select>
                                                                                <Input
                                                                                    type="date"
                                                                                    value={formData.data_publicacao || ''}
                                                                                    onChange={e => setFormData({ ...formData, data_publicacao: e.target.value })}
                                                                                    className="h-8 text-xs w-full"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="space-y-1.5">
                                                                            <div className="font-semibold text-sm leading-tight text-foreground/90">
                                                                                {update.titulo}
                                                                            </div>
                                                                            
                                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                                                                    update.tipo === 'NOVO RECURSO' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                                                                                }`}>
                                                                                    {update.tipo}
                                                                                </span>
                                                                                <span className="text-[10px] text-muted-foreground ml-auto bg-muted/50 px-1.5 py-0.5 rounded">
                                                                                    {update.data_publicacao}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                        
                                                        <CardFooter className="p-2 pt-0 flex justify-end gap-1.5 bg-muted/20 border-t border-border/50">
                                                            {editingId === update.id ? (
                                                                <Button size="sm" onClick={() => handleSaveEdit(update.id, update)} className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700">
                                                                    <Save className="w-3 h-3 mr-1" /> Salvar
                                                                </Button>
                                                            ) : (
                                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:bg-muted" onClick={() => startEdit(update)}>
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteMutation.mutate(update.id)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}

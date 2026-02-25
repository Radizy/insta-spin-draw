import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Tv, Cloud, Youtube, Image, Video, Plus, Trash2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { MediaGalleryModal } from './MediaGalleryModal';

interface TvPlaylistManagerProps {
    franquiaId: string;
    unidadeId: string;
}

interface PlaylistItem {
    id: string;
    tipo: 'imagem' | 'video' | 'youtube' | 'clima';
    url: string | null;
    duracao: number;
    volume: number;
    ordem: number;
    ativo: boolean;
}

export function TvPlaylistManager({ franquiaId, unidadeId }: TvPlaylistManagerProps) {
    const queryClient = useQueryClient();
    const [cidadeClima, setCidadeClima] = useState<string>('');

    // Busca a tabela 'unidades' para pegar a cidade atual
    const { data: unidadeData, isLoading: loadingUnidade } = useQuery({
        queryKey: ['unidade-cidade-clima-config', unidadeId],
        queryFn: async () => {
            if (!unidadeId) return null;
            const { data, error } = await supabase
                .from('unidades')
                .select('id, cidade_clima')
                .eq('id', unidadeId)
                .single();
            if (error) throw error;
            if (data) {
                setCidadeClima(data.cidade_clima || '');
            }
            return data;
        },
        enabled: !!unidadeId,
    });

    const saveCidadeMutation = useMutation({
        mutationFn: async (cidade: string) => {
            if (!unidadeData?.id) return;
            const { error } = await supabase
                .from('unidades')
                .update({ cidade_clima: cidade })
                .eq('id', unidadeData.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Cidade do Clima atualizada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['unidade-cidade-clima-config', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['unidade-cidade-clima', unidadeId] }); // para a TV att
        },
        onError: () => toast.error('Erro ao salvar cidade do clima.'),
    });

    // Busca a fila da playlist usando a unidade_id (neste caso, obtemos do unidadeData)
    const { data: playlist = [], isLoading: loadingPlaylist } = useQuery<PlaylistItem[]>({
        queryKey: ['tv-playlist-config', unidadeData?.id],
        queryFn: async () => {
            if (!unidadeData?.id) return [];
            const { data, error } = await supabase
                .from('tv_playlist')
                .select('*')
                .eq('unidade_id', unidadeData.id)
                .order('ordem', { ascending: true });
            if (error) throw error;
            return data as PlaylistItem[];
        },
        enabled: !!unidadeData?.id,
    });

    const [novoItem, setNovoItem] = useState<{
        tipo: 'imagem' | 'video' | 'youtube' | 'clima';
        url: string;
        duracao: number;
        volume: number;
    }>({
        tipo: 'imagem',
        url: '',
        duracao: 15,
        volume: 0,
    });

    const updateItemMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: Partial<PlaylistItem> }) => {
            const { error } = await supabase.from('tv_playlist').update(updates).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tv-playlist-config', unidadeData?.id] });
            queryClient.invalidateQueries({ queryKey: ['tv-playlist', unidadeData?.id] });
        },
    });

    const addItemMutation = useMutation({
        mutationFn: async () => {
            if (!unidadeData?.id) throw new Error("Unidade não encontrada");
            const { error } = await supabase.from('tv_playlist').insert({
                unidade_id: unidadeData.id,
                tipo: novoItem.tipo,
                url: novoItem.tipo === 'clima' ? null : novoItem.url,
                duracao: novoItem.duracao,
                volume: novoItem.volume || 0,
                ordem: playlist.length,
                ativo: true,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Item adicionado à playlist!');
            setNovoItem({ tipo: 'imagem', url: '', duracao: 15, volume: 0 });
            queryClient.invalidateQueries({ queryKey: ['tv-playlist-config', unidadeData?.id] });
            queryClient.invalidateQueries({ queryKey: ['tv-playlist', unidadeData?.id] });
        },
        onError: () => toast.error('Erro ao adicionar item na playlist.'),
    });

    const deleteItemMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('tv_playlist').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Item removido da playlist.');
            queryClient.invalidateQueries({ queryKey: ['tv-playlist-config', unidadeData?.id] });
            queryClient.invalidateQueries({ queryKey: ['tv-playlist', unidadeData?.id] });
        },
    });

    const toggleAtivoMutation = useMutation({
        mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
            const { error } = await supabase.from('tv_playlist').update({ ativo }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tv-playlist-config', unidadeData?.id] });
            queryClient.invalidateQueries({ queryKey: ['tv-playlist', unidadeData?.id] });
        },
    });

    const reorderMutation = useMutation({
        mutationFn: async (items: PlaylistItem[]) => {
            // Atualiza de um em um devido as constraints do json
            for (const item of items) {
                await supabase
                    .from('tv_playlist')
                    .update({ ordem: item.ordem })
                    .eq('id', item.id);
            }
        },
        onSuccess: () => {
            toast.success('Ordem da playlist atualizada.');
            queryClient.invalidateQueries({ queryKey: ['tv-playlist', unidadeData?.id] });
        },
    });

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(playlist);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Muta otimisticamente
        queryClient.setQueryData(['tv-playlist-config', unidadeData?.id], items);

        // Atualiza campo 'ordem' base no novo array e joga pro backend
        const updatedOrder = items.map((item, index) => ({ ...item, ordem: index }));
        reorderMutation.mutate(updatedOrder);
    };

    const IconMap = {
        imagem: Image,
        video: Video,
        youtube: Youtube,
        clima: Cloud,
    };

    return (
        <div className="mt-6 border-t border-border pt-6 space-y-6">
            <div className="flex items-center gap-2">
                <Tv className="w-5 h-5 text-primary" />
                <span className="text-base font-semibold">Screensaver / Fila Ociosa da TV</span>
            </div>
            <p className="text-sm text-muted-foreground">
                A TV exibirá os itens abaixo quando estiver ociosa (sem fila ou chamadas). O primeiro item
                do Slide começa a rodar após 15s sem movimentos do mouse.
            </p>

            {/* Bloco 1: Configurar Cidade do Clima */}
            <div className="bg-muted/40 border border-border rounded-lg p-5 flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 space-y-2 w-full">
                    <Label>Cidade Base para a Previsão (Para a unidade atual)</Label>
                    <Input
                        placeholder="Ex: Sao Paulo, BR ou Itaquaquecetuba"
                        value={cidadeClima}
                        onChange={(e) => setCidadeClima(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                        Sintaxe City, Country. Preencha apenas se for usar Slides de Clima no painel. Respeite caracteres nativos do OpenWeatherMap.
                    </p>
                </div>
                <Button
                    disabled={loadingUnidade || saveCidadeMutation.isPending}
                    onClick={() => saveCidadeMutation.mutate(cidadeClima)}
                    className="w-full sm:w-auto"
                >
                    {saveCidadeMutation.isPending ? 'Salvando...' : 'Salvar Cidade'}
                </Button>
            </div>

            {/* Bloco 2: Adicionar um Item na Fila */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-card p-4 rounded-lg border border-border">
                <div className="md:col-span-3 space-y-2">
                    <Label>Tipo de Mídia</Label>
                    <Select
                        value={novoItem.tipo}
                        onValueChange={(val: any) => setNovoItem({ ...novoItem, tipo: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="clima">Widget de Clima (Previsão)</SelectItem>
                            <SelectItem value="imagem">Imagem (URL)</SelectItem>
                            <SelectItem value="youtube">YouTube (Vídeo ou Playlist)</SelectItem>
                            <SelectItem value="video">Vídeo Direto (.mp4 URL)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-5 space-y-2">
                    <Label>URL da Mídia {novoItem.tipo === 'clima' ? '(Não necessário)' : ''}</Label>
                    <div className="flex gap-2">
                        <Input
                            placeholder={novoItem.tipo === 'clima' ? "Puxará cidade da loja" : "https://..."}
                            disabled={novoItem.tipo === 'clima'}
                            value={novoItem.url}
                            onChange={(e) => setNovoItem({ ...novoItem, url: e.target.value })}
                        />
                        {(novoItem.tipo === 'imagem' || novoItem.tipo === 'video') && (
                            <MediaGalleryModal
                                title="Galeria da Franquia"
                                acceptedTypes={novoItem.tipo === 'imagem' ? ['image'] : ['video']}
                                onSelect={(url) => setNovoItem({ ...novoItem, url })}
                                triggerButton={
                                    <Button type="button" variant="outline" size="icon" title="Abrir Galeria">
                                        {novoItem.tipo === 'imagem' ? <Image className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <Label>Segundos no Ar</Label>
                    <Input
                        type="number"
                        min={5}
                        value={novoItem.duracao}
                        onChange={(e) => setNovoItem({ ...novoItem, duracao: Number(e.target.value) })}
                    />
                </div>

                <div className="md:col-span-2">
                    <Button
                        className="w-full gap-2"
                        disabled={addItemMutation.isPending || (novoItem.tipo !== 'clima' && !novoItem.url)}
                        onClick={() => addItemMutation.mutate()}
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar
                    </Button>
                </div>
            </div>

            {/* Bloco 3: Tabela de Itens (Sortable / Drag&Drop) */}
            <div className="space-y-3">
                <Label>Fila de Reprodução (Mova para alterar a ordem)</Label>

                {loadingPlaylist ? (
                    <p className="text-sm text-muted-foreground">Carregando playlist...</p>
                ) : playlist.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 bg-muted/20 border-dashed rounded-lg border border-border text-center">
                        Sua TV não mostrará nada de fundo. Insira blocos de imagens ou previsão acima para começar.
                    </p>
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="playlist">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-2"
                                >
                                    {playlist.map((item, index) => {
                                        const ExtentIcon = IconMap[item.tipo];
                                        return (
                                            <Draggable key={item.id} draggableId={item.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`flex items-center gap-3 p-3 bg-card border border-border rounded-lg shadow-sm transition-colors ${snapshot.isDragging ? 'border-primary ring-1 ring-primary/20 bg-accent/50' : 'hover:bg-accent/10'
                                                            }`}
                                                    >
                                                        <div {...provided.dragHandleProps} className="p-2 -ml-2 text-muted-foreground hover:text-foreground cursor-grab">
                                                            <GripVertical className="w-4 h-4" />
                                                        </div>

                                                        <div className="p-2 bg-secondary rounded-lg">
                                                            <ExtentIcon className="w-4 h-4 text-foreground" />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium capitalize truncate">
                                                                {item.tipo === 'clima' ? 'Clima e Previsão Local' : item.tipo}
                                                            </p>
                                                            {item.url && (
                                                                <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {(item.tipo === 'youtube' || item.tipo === 'video') && (
                                                                <div className="flex items-center gap-2 w-32 px-2">
                                                                    <span className="text-[10px] text-muted-foreground uppercase" title="Volume">Vol:</span>
                                                                    <Slider
                                                                        defaultValue={[item.volume || 0]}
                                                                        max={100}
                                                                        step={5}
                                                                        onValueCommit={(val) => updateItemMutation.mutate({ id: item.id, updates: { volume: val[0] } })}
                                                                        className="flex-1 cursor-pointer"
                                                                    />
                                                                    <span className="text-[10px] text-muted-foreground w-6 text-right">{item.volume || 0}%</span>
                                                                </div>
                                                            )}
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[10px] text-muted-foreground mr-1 uppercase">Tempo:</span>
                                                                <Input
                                                                    type="number"
                                                                    min={5}
                                                                    className="w-14 h-7 text-xs bg-muted/50 p-1 text-center"
                                                                    defaultValue={item.duracao}
                                                                    onBlur={(e) => updateItemMutation.mutate({ id: item.id, updates: { duracao: Number(e.target.value) } })}
                                                                />
                                                                <span className="text-xs text-muted-foreground">s</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 pl-3 border-l border-border">
                                                            <Switch
                                                                checked={item.ativo}
                                                                disabled={toggleAtivoMutation.isPending}
                                                                onCheckedChange={(val) => toggleAtivoMutation.mutate({ id: item.id, ativo: val })}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                                onClick={() => {
                                                                    if (confirm('Deseja excluir este item da TV?')) {
                                                                        deleteItemMutation.mutate(item.id);
                                                                    }
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>

        </div>
    );
}

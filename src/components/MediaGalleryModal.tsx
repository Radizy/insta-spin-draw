import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Image as ImageIcon,
    Video,
    Music,
    Upload,
    Trash2,
    Check,
    Loader2,
    FileAudio,
    Play,
    Pause
} from 'lucide-react';
import { toast } from 'sonner';

type MediaType = 'image' | 'video' | 'audio';

export interface MediaItem {
    name: string;
    url: string;
    type: MediaType;
    createdAt: string;
}

interface MediaGalleryModalProps {
    onSelect?: (url: string) => void;
    acceptedTypes?: MediaType[];
    title?: string;
    triggerButton?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

export function MediaGalleryModal({
    onSelect,
    acceptedTypes = ['image', 'video', 'audio'],
    title = "Galeria de Mídia",
    triggerButton,
    open: controlledOpen,
    onOpenChange: setControlledOpen
}: MediaGalleryModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen : setInternalOpen;

    const [activeTab, setActiveTab] = useState<MediaType>(acceptedTypes[0]);
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [playingAudio, setPlayingAudio] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Categorização baseada em extensão
    const getMediaType = (filename: string): MediaType => {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
        if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
        return 'image';
    };

    const { data: mediaItems = [], isLoading } = useQuery({
        queryKey: ['franquia-media', user?.franquiaId],
        queryFn: async () => {
            if (!user?.franquiaId) return [];

            const { data, error } = await supabase.storage
                .from('franquia_media')
                .list(user.franquiaId, {
                    sortBy: { column: 'created_at', order: 'desc' }
                });

            if (error) {
                console.error("Erro ao listar mídia", error);
                return [];
            }

            const items: MediaItem[] = data
                .filter(f => f.name !== '.emptyFolderPlaceholder')
                .map(file => {
                    const { data: publicUrl } = supabase.storage
                        .from('franquia_media')
                        .getPublicUrl(`${user.franquiaId}/${file.name}`);

                    return {
                        name: file.name,
                        url: publicUrl.publicUrl,
                        type: getMediaType(file.name),
                        createdAt: file.created_at
                    };
                });

            return items;
        },
        enabled: !!user?.franquiaId && open
    });

    const uploadMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user?.franquiaId) throw new Error("Usuário sem franquia");

            // Sanitizar nome do arquivo e evitar conflitos usando timestamp
            const fileExt = file.name.split('.').pop();
            const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(`.${fileExt}`, '');
            const fileName = `${safeName}-${Date.now()}.${fileExt}`;
            const filePath = `${user.franquiaId}/${fileName}`;

            const { error } = await supabase.storage
                .from('franquia_media')
                .upload(filePath, file);

            if (error) throw error;
            return fileName;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franquia-media', user?.franquiaId] });
            toast.success("Arquivo importado para a galeria!");
        },
        onError: (error) => {
            toast.error("Erro ao importar: " + error.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (fileName: string) => {
            if (!user?.franquiaId) throw new Error("Sem acesso");
            const { error } = await supabase.storage
                .from('franquia_media')
                .remove([`${user.franquiaId}/${fileName}`]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franquia-media', user?.franquiaId] });
            toast.success("Arquivo removido da galeria");
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const type = getMediaType(file.name);
            if (!acceptedTypes.includes(type)) {
                toast.error(`Aba atual de arquivos não aceita este formato (${type}). Siga as extensões recomendadas.`);
                return;
            }
            uploadMutation.mutate(file);
        }
    };

    const handleTriggerUpload = () => {
        fileInputRef.current?.click();
    };

    const toggleAudio = (url: string) => {
        if (playingAudio === url) {
            audioRef.current?.pause();
            setPlayingAudio(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(url);
            audio.onended = () => setPlayingAudio(null);
            audio.play();
            audioRef.current = audio;
            setPlayingAudio(url);
        }
    };

    const filteredItems = mediaItems.filter(item => item.type === activeTab && acceptedTypes.includes(item.type));

    const acceptString = activeTab === 'image' ? 'image/*' : activeTab === 'video' ? 'video/mp4,video/webm' : 'audio/*';

    return (
        <Dialog open={open} onOpenChange={(v) => {
            setOpen(v);
            if (!v && audioRef.current) {
                audioRef.current.pause();
                setPlayingAudio(null);
            }
        }}>
            {triggerButton && (
                <DialogTrigger asChild>
                    {triggerButton}
                </DialogTrigger>
            )}

            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                <div className="p-6 pb-2">
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            Selecione um arquivo já enviado ou faça upload de um novo para sua franquia.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MediaType)} className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 flex items-center justify-between border-b pb-2">
                        <TabsList>
                            {acceptedTypes.includes('image') && (
                                <TabsTrigger value="image" className="gap-2">
                                    <ImageIcon className="w-4 h-4" /> Fotos
                                </TabsTrigger>
                            )}
                            {acceptedTypes.includes('video') && (
                                <TabsTrigger value="video" className="gap-2">
                                    <Video className="w-4 h-4" /> Vídeos
                                </TabsTrigger>
                            )}
                            {acceptedTypes.includes('audio') && (
                                <TabsTrigger value="audio" className="gap-2">
                                    <Music className="w-4 h-4" /> Áudios
                                </TabsTrigger>
                            )}
                        </TabsList>

                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept={acceptString}
                                onChange={handleFileChange}
                            />
                            <Button onClick={handleTriggerUpload} disabled={uploadMutation.isPending} size="sm" className="gap-2">
                                {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                Enviar Novo {activeTab === 'image' ? 'Imagem' : activeTab === 'video' ? 'Vídeo' : 'Áudio'}
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        {isLoading ? (
                            <div className="flex h-32 items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col h-40 items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted/20">
                                <p className="text-muted-foreground text-sm">Nenhum arquivo encontrado nesta categoria.</p>
                                <Button variant="link" onClick={handleTriggerUpload}>Fazer primeiro upload</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredItems.map((item) => (
                                    <Card key={item.name} className="overflow-hidden group relative">
                                        <div className="aspect-video bg-muted relative flex items-center justify-center">
                                            {item.type === 'image' ? (
                                                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                            ) : item.type === 'video' ? (
                                                <video src={item.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
                                                    <Button
                                                        variant="secondary"
                                                        size="icon"
                                                        className="rounded-full w-12 h-12 shadow-sm"
                                                        onClick={() => toggleAudio(item.url)}
                                                    >
                                                        {playingAudio === item.url ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                                                    </Button>
                                                    <span className="text-xs truncate w-full px-2" title={item.name}>{item.name.replace(/-\d+\.mp3$/, '')}</span>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                {onSelect && (
                                                    <Button size="sm" variant="default" className="gap-1" onClick={() => {
                                                        onSelect(item.url);
                                                        setOpen(false);
                                                    }}>
                                                        <Check className="w-4 h-4" /> Selecionar
                                                    </Button>
                                                )}
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="h-9 w-9"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm("Deseja deletar este arquivo permanentemente de sua galeria?")) {
                                                            deleteMutation.mutate(item.name);
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}

import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Pencil, Mic, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface FranquiaBagsSectionProps {
  franquiaId: string;
}

interface FranquiaBagTipoRow {
  id: string;
  franquia_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

export const FranquiaBagsSection: React.FC<FranquiaBagsSectionProps> = ({ franquiaId }) => {
  const queryClient = useQueryClient();
  const [bagForm, setBagForm] = useState({ id: '', nome: '', descricao: '' });
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bagForUpload, setBagForUpload] = useState<FranquiaBagTipoRow | null>(null);

  const { data: bagTipos = [], isLoading } = useQuery<FranquiaBagTipoRow[]>({
    queryKey: ['franquia-bag-tipos', franquiaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquia_bag_tipos')
        .select('id, franquia_id, nome, descricao, ativo')
        .eq('franquia_id', franquiaId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as FranquiaBagTipoRow[];
    },
  });

  // Buscar áudios de bags existentes
  const { data: bagAudios = [], refetch: refetchAudios } = useQuery({
    queryKey: ['franquia-bags-audios', franquiaId],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('motoboy_voices')
        .list(`${franquiaId}/bags`);
      if (error) {
        // Pasta pode não existir, retornar vazio
        return [];
      }
      return data || [];
    },
  });

  const upsertBagMutation = useMutation({
    mutationFn: async () => {
      const nome = bagForm.nome.trim();
      if (!nome) throw new Error('Nome do tipo de BAG é obrigatório');

      const payload = {
        franquia_id: franquiaId,
        nome,
        descricao: bagForm.descricao.trim() || null,
      };

      if (bagForm.id) {
        const { error } = await supabase
          .from('franquia_bag_tipos')
          .update(payload)
          .eq('id', bagForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('franquia_bag_tipos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setBagForm({ id: '', nome: '', descricao: '' });
      queryClient.invalidateQueries({ queryKey: ['franquia-bag-tipos', franquiaId] });
      toast.success('Bolsa salva com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar bag: ' + err.message);
    }
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async (bag: FranquiaBagTipoRow) => {
      const { error } = await supabase
        .from('franquia_bag_tipos')
        .update({ ativo: !bag.ativo })
        .eq('id', bag.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquia-bag-tipos', franquiaId] });
    },
  });

  const deleteBagMutation = useMutation({
    mutationFn: async (bag: FranquiaBagTipoRow) => {
      // Deletar da tabela
      const { error } = await supabase
        .from('franquia_bag_tipos')
        .delete()
        .eq('id', bag.id);
      if (error) throw error;

      // Deletar o áudio, caso exista
      const audioPath = `${franquiaId}/bags/${bag.id}.mp3`;
      await supabase.storage.from('motoboy_voices').remove([audioPath]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquia-bag-tipos', franquiaId] });
      refetchAudios();
      toast.success('Bolsa excluída.');
    },
  });

  const uploadAudioBagMutation = useMutation({
    mutationFn: async ({ file, bagId }: { file: File, bagId: string }) => {
      const filePath = `${franquiaId}/bags/${bagId}.mp3`;
      const { error } = await supabase.storage
        .from('motoboy_voices')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Áudio da bolsa carregado com sucesso!');
      refetchAudios();
    },
    onError: (error) => {
      toast.error('Erro ao fazer upload do áudio: ' + error.message);
    },
    onSettled: () => {
      setUploadingId(null);
      setBagForUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  });

  const deleteAudioBagMutation = useMutation({
    mutationFn: async (bagId: string) => {
      const filePath = `${franquiaId}/bags/${bagId}.mp3`;
      const { error } = await supabase.storage
        .from('motoboy_voices')
        .remove([filePath]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Áudio da bolsa removido com sucesso!');
      refetchAudios();
    },
    onError: (error) => {
      toast.error('Erro ao deletar o áudio: ' + error.message);
    }
  });

  const startEdit = (bag: FranquiaBagTipoRow) => {
    setBagForm({ id: bag.id, nome: bag.nome, descricao: bag.descricao || '' });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !bagForUpload) return;

    if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) {
      toast.error('O arquivo deve ser um áudio no formato MP3.');
      return;
    }

    setUploadingId(bagForUpload.id);
    uploadAudioBagMutation.mutate({ file, bagId: bagForUpload.id });
  };

  const triggerFileInput = (bag: FranquiaBagTipoRow) => {
    setBagForUpload(bag);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const checkHasAudio = (bagId: string) => {
    return bagAudios.some(f => f.name === `${bagId}.mp3`);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-mono">Tipos de BAG da franquia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3 items-end">
            <div className="space-y-2">
              <Label>Nome do tipo</Label>
              <Input
                placeholder="Ex: BAG Normal, BAG Metro"
                value={bagForm.nome}
                onChange={(e) => setBagForm({ ...bagForm, nome: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (bagForm.nome.trim()) upsertBagMutation.mutate();
                  }
                }}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descrição interna para identificação"
                value={bagForm.descricao}
                onChange={(e) => setBagForm({ ...bagForm, descricao: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (bagForm.nome.trim()) upsertBagMutation.mutate();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={upsertBagMutation.isPending || !bagForm.nome.trim()}
              onClick={() => upsertBagMutation.mutate()}
            >
              {bagForm.id ? 'Atualizar tipo' : 'Adicionar tipo'}
            </Button>
          </div>

          {/* Input oculto de upload */}
          <input
            type="file"
            accept="audio/mpeg,.mp3"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando tipos de BAG...</p>
          ) : bagTipos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum tipo de BAG cadastrado ainda.</p>
          ) : (
            <div className="space-y-2">
              {bagTipos.map((bag) => {
                const hasAudio = checkHasAudio(bag.id);
                const isUploading = uploadingId === bag.id;

                return (
                  <div
                    key={bag.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border px-4 py-3 text-sm gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{bag.nome}</p>
                        {hasAudio && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full font-medium">
                            <Mic className="w-3 h-3" /> Áudio Anexado
                          </span>
                        )}
                      </div>

                      {bag.descricao && (
                        <p className="text-xs text-muted-foreground">{bag.descricao}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                      <span className="text-xs text-muted-foreground mr-1">
                        {bag.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <Switch
                        checked={bag.ativo}
                        onCheckedChange={() => toggleAtivoMutation.mutate(bag)}
                      />

                      <div className="h-6 w-px bg-border mx-1"></div>

                      {hasAudio ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => {
                            if (confirm(`Remover áudio de ${bag.nome}? A TV voltará a falar com a voz do computador.`)) {
                              deleteAudioBagMutation.mutate(bag.id);
                            }
                          }}
                          disabled={deleteAudioBagMutation.isPending}
                        >
                          <X className="w-4 h-4" />
                          Remover Áudio
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-9 gap-2"
                          onClick={() => triggerFileInput(bag)}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                          {isUploading ? 'Anexando...' : 'Anexar Áudio (MP3)'}
                        </Button>
                      )}

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => startEdit(bag)}
                        title="Editar tipo de bag"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Excluir o tipo de BAG "${bag.nome}"?`)) {
                            deleteBagMutation.mutate(bag);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

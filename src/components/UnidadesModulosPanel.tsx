import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Store, Tag, Loader2, ShieldCheck } from 'lucide-react';
import { ativarModulo, desativarModulo } from '@/lib/api';
import { toast } from 'sonner';

interface UnidadesModulosPanelProps {
  franquiaId?: string;
}

export function UnidadesModulosPanel({ franquiaId }: UnidadesModulosPanelProps) {
  const queryClient = useQueryClient();

  // 1. Carrega todas as unidades (lojas)
  const { data: unidades = [], isLoading: loadingUnidades } = useQuery({
    queryKey: ['unidades-modulos-panel', franquiaId],
    queryFn: async () => {
      let query = supabase.from('unidades').select('id, nome_loja, franquia_id').order('nome_loja');
      if (franquiaId) {
        query = query.eq('franquia_id', franquiaId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // 2. Carrega todos os registros da tabela `unidade_modulos`
  const { data: unidadeModulosList = [], isLoading: loadingUnidadeModulos } = useQuery({
    queryKey: ['unidade-modulos-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidade_modulos')
        .select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Mutation para alternar módulo de uma unidade específica
  const toggleModuloLojaMutation = useMutation({
    mutationFn: async ({ unidadeId, moduloCodigo, ativo }: { unidadeId: string; moduloCodigo: string; ativo: boolean }) => {
      if (ativo) {
        await ativarModulo(unidadeId, moduloCodigo);
      } else {
        await desativarModulo(unidadeId, moduloCodigo);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['unidade-modulos-all'] });
      queryClient.invalidateQueries({ queryKey: ['modulo-ativo-unidade'] });
      queryClient.invalidateQueries({ queryKey: ['modulo-ativo'] });
      toast.success(`Módulo ${variables.moduloCodigo} ${variables.ativo ? 'ativado' : 'desativado'} para a loja!`);
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão do módulo da loja.');
    },
  });

  if (loadingUnidades || loadingUnidadeModulos) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        Carregando permissões por loja...
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-border/60 pt-6 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold font-mono text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            Isolamento & Controle de Módulos por Loja (Unidade)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Habilite ou desabilite módulos individualmente por unidade (ex: Módulo de Etiquetas de Validade)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {unidades.map((unidade) => {
          // Checa se existe registro específico da loja para etiquetas
          const regEtiquetas = unidadeModulosList.find(
            (m) => m.unidade_id === unidade.id && m.modulo_codigo === 'etiquetas'
          );
          // Se regEtiquetas não existir, assume padrão (true) ou o status do reg. Se existir, usa reg.ativo
          const etiquetasAtivo = regEtiquetas ? !!regEtiquetas.ativo : true;

          return (
            <Card key={unidade.id} className="border-border/80 bg-card/60 shadow-sm">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-xs font-extrabold text-foreground flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-amber-400" />
                    <span>{unidade.nome_loja}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-400 bg-amber-500/10">
                    ID: {unidade.id.slice(0, 8)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 pt-1 space-y-2 text-xs">
                {/* Switch Módulo Etiquetas */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <span className="font-bold text-foreground block">Etiquetas de Validade</span>
                      <span className="text-[10px] text-muted-foreground block">Módulo de impressão térmica</span>
                    </div>
                  </div>
                  <Switch
                    checked={etiquetasAtivo}
                    disabled={toggleModuloLojaMutation.isPending}
                    onCheckedChange={(checked) => {
                      toggleModuloLojaMutation.mutate({
                        unidadeId: unidade.id,
                        moduloCodigo: 'etiquetas',
                        ativo: checked,
                      });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {unidades.length === 0 && (
          <div className="col-span-full text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
            Nenhuma unidade (loja) cadastrada para gerenciar permissões individuais.
          </div>
        )}
      </div>
    </div>
  );
}

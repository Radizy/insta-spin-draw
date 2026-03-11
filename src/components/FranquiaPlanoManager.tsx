import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, Check, X, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { isModuloAtivo, ativarModulo, desativarModulo } from '@/lib/api';

interface Modulo {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number | null;
  ativo: boolean | null;
}

interface UnidadeModuloRow {
  id: string;
  modulo_codigo: string;
  ativo: boolean;
  data_ativacao: string | null;
}

export function FranquiaPlanoManager() {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  const queryClient = useQueryClient();

  const unidadeId = user?.unidadeId;
  const franquiaId = user?.franquiaId;

  // All available modules (active globally)
  const { data: allModulos = [], isLoading: loadingModulos } = useQuery<Modulo[]>({
    queryKey: ['modulos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('id, codigo, nome, descricao, preco_mensal, ativo')
        .eq('ativo', true)
        .order('created_at');
      if (error) throw error;
      return data as any;
    },
  });

  // Modules active for this unit
  const { data: unitModulos = [], isLoading: loadingUnit } = useQuery<UnidadeModuloRow[]>({
    queryKey: ['unidade-modulos', unidadeId],
    enabled: !!unidadeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidade_modulos')
        .select('id, modulo_codigo, ativo, data_ativacao')
        .eq('unidade_id', unidadeId!)
        .eq('ativo', true);
      if (error) throw error;
      return data as any;
    },
  });

  // Franchise info
  const { data: franquia } = useQuery({
    queryKey: ['franquia-info', franquiaId],
    enabled: !!franquiaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('franquias')
        .select('nome_franquia, status_pagamento, data_vencimento')
        .eq('id', franquiaId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const activeCodes = new Set(unitModulos.map((um) => um.modulo_codigo));

  const toggleModuleMutation = useMutation({
    mutationFn: async ({ codigo, activate }: { codigo: string; activate: boolean }) => {
      if (!unidadeId) throw new Error('Unidade não selecionada');
      if (activate) {
        await ativarModulo(unidadeId, codigo);
      } else {
        await desativarModulo(unidadeId, codigo);
      }
    },
    onSuccess: (_, { activate, codigo }) => {
      toast.success(activate ? `Módulo "${codigo}" ativado` : `Módulo "${codigo}" desativado`);
      queryClient.invalidateQueries({ queryKey: ['unidade-modulos', unidadeId] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro'),
  });

  const inactiveModulos = allModulos.filter((m) => !activeCodes.has(m.codigo));

  if (!franquiaId || !unidadeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhuma franquia/unidade vinculada ao usuário.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Resumo da Franquia ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5" /> Gerenciar Plano
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Franquia:</span>{' '}
              <strong>{franquia?.nome_franquia || '—'}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{' '}
              <Badge variant={franquia?.status_pagamento === 'ativo' ? 'default' : 'destructive'} className="text-[10px] uppercase ml-1">
                {franquia?.status_pagamento || 'desconhecido'}
              </Badge>
            </div>
            {franquia?.data_vencimento && (
              <div>
                <span className="text-muted-foreground">Vencimento:</span>{' '}
                <strong>{new Date(franquia.data_vencimento).toLocaleDateString('pt-BR')}</strong>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Módulos da Franquia (UI Nova) ── */}
      <Card className="border-border/50 shadow-sm mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <Package className="w-5 h-5 text-primary" />
            Módulos da Unidade
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie as funcionalidades ativas para esta unidade.
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
              Módulos Contratados
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px]">
                {activeCodes.size}
              </span>
            </h3>
            
            {loadingUnit || loadingModulos ? (
               <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                 <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando...
               </div>
            ) : activeCodes.size === 0 ? (
              <div className="p-6 border border-dashed rounded-xl bg-muted/10 text-center">
                <p className="text-sm text-muted-foreground">Nenhum módulo ativo no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unitModulos.map((um) => {
                  const m = allModulos.find(mod => mod.codigo === um.modulo_codigo);
                  if (!m) return null;
                  return (
                    <div key={um.id} className="relative flex flex-col p-4 border border-primary/20 bg-primary/5 rounded-xl transition-all hover:bg-primary/10 hover:border-primary/30 group">
                      <div className="absolute top-3 right-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-500 rounded-md text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
                          <Check className="w-3 h-3" />
                          Ativo
                        </div>
                      </div>
                      <span className="font-bold text-sm pr-16 block">{m.nome}</span>
                      <p className="text-xs text-muted-foreground/80 mt-1 mb-3 line-clamp-2 min-h-[32px]">{m.descricao}</p>
                      <div className="mt-auto pt-3 border-t border-primary/10 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-2 py-0.5 rounded-md">{m.codigo}</span>
                        <Button
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-[11px] px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => toggleModuleMutation.mutate({ codigo: um.modulo_codigo, activate: false })}
                          disabled={toggleModuleMutation.isPending}
                        >
                          Desativar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              Disponíveis para Contratar
              <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px]">
                {inactiveModulos.length}
              </span>
            </h3>
            
            {inactiveModulos.length === 0 ? (
              <p className="text-sm text-muted-foreground pl-1">Você já ativou todos os módulos disponíveis!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inactiveModulos.map((m) => {
                  return (
                    <div key={m.id} className="flex flex-col p-4 border border-border/50 bg-card rounded-xl transition-all hover:border-border/80">
                      <span className="font-bold text-sm text-foreground/80 block">{m.nome}</span>
                      <p className="text-xs text-muted-foreground mt-1 mb-3 line-clamp-2 min-h-[32px]">{m.descricao}</p>
                      <div className="mt-auto pt-3 border-t border-border/30 flex items-center justify-between">
                        <span className="text-xs font-bold text-muted-foreground">
                          {m.preco_mensal ? `R$ ${m.preco_mensal.toFixed(2)}/mês` : 'Gratuito'}
                        </span>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 text-[11px] px-3 hover:bg-primary hover:text-primary-foreground"
                          onClick={() => toggleModuleMutation.mutate({ codigo: m.codigo, activate: true })}
                          disabled={toggleModuleMutation.isPending}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

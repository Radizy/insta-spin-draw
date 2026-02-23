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
import { Package, Check, X, Plus, ShoppingCart, Loader2 } from 'lucide-react';
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
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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

      {/* ── Recursos / Funcionalidades ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Recursos da Franquia
          </h3>
          <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Adicionar Produto
          </Button>
        </div>

        {(loadingModulos || loadingUnit) ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allModulos.map((m) => {
              const isActive = activeCodes.has(m.codigo);
              return (
                <Badge
                  key={m.id}
                  variant={isActive ? 'default' : 'outline'}
                  className={`cursor-pointer text-xs py-1.5 px-3 gap-1.5 transition-all ${
                    isActive
                      ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => toggleModuleMutation.mutate({ codigo: m.codigo, activate: !isActive })}
                >
                  {isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                  {m.nome}
                  <span className="text-[10px] uppercase ml-1 opacity-75">
                    {isActive ? 'HABILITADO' : 'DESABILITADO'}
                  </span>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Módulos ativos (detalhes) ── */}
      {unitModulos.length > 0 && (
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Produtos Ativos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unitModulos.map((um) => {
              const mod = allModulos.find((m) => m.codigo === um.modulo_codigo);
              return (
                <Card key={um.id} className="border-primary/30">
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{mod?.nome || um.modulo_codigo}</span>
                      <Badge className="text-[10px] bg-green-600 text-white">ATIVO</Badge>
                    </div>
                    {mod?.descricao && <p className="text-xs text-muted-foreground">{mod.descricao}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {mod?.preco_mensal ? `R$ ${mod.preco_mensal.toFixed(2)}/mês` : 'Incluído'}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => toggleModuleMutation.mutate({ codigo: um.modulo_codigo, activate: false })}
                      >
                        Desativar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Dialog: Adicionar Produto ── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Adicionar Produto
            </DialogTitle>
          </DialogHeader>
          {inactiveModulos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Todos os módulos já estão ativados!
            </p>
          ) : (
            <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
              {inactiveModulos.map((m) => (
                <Card key={m.id} className="border-border hover:border-primary/40 transition-colors">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="font-medium text-sm">{m.nome}</p>
                        {m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                        <p className="text-sm font-bold text-primary">
                          {m.preco_mensal ? `R$ ${m.preco_mensal.toFixed(2)}/mês` : 'Grátis'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          toggleModuleMutation.mutate({ codigo: m.codigo, activate: true });
                          setAddDialogOpen(false);
                        }}
                        disabled={toggleModuleMutation.isPending}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

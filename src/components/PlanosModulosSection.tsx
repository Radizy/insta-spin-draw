import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Pencil, Trash2, Check, X, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ModuloRow {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number | null;
  ativo: boolean | null;
}

interface PacoteRow {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  preco_total: number;
  desconto_percent: number | null;
  plano_id: string | null;
  modulos_inclusos: string[] | null;
  ativo: boolean | null;
}

// ── Super Admin: Módulos + Pacotes ──────────────────────────────────────────
export function PlanosModulosSection() {
  const queryClient = useQueryClient();
  const [moduloDialogOpen, setModuloDialogOpen] = useState(false);
  const [pacoteDialogOpen, setPacoteDialogOpen] = useState(false);

  const [moduloForm, setModuloForm] = useState({
    id: '',
    nome: '',
    codigo: '',
    descricao: '',
    preco_mensal: '',
  });

  const [pacoteForm, setPacoteForm] = useState({
    id: '',
    nome: '',
    codigo: '',
    descricao: '',
    preco_total: '',
    desconto_percent: '',
    plano_id: '',
    modulos_inclusos: [] as string[],
  });

  // ── Queries ──
  const { data: planos = [] } = useQuery({
    queryKey: ['planos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('planos').select('id, nome, tipo');
      if (error) throw error;
      return data as { id: string; nome: string; tipo: string }[];
    },
  });

  const { data: modulos = [], isLoading: loadingModulos } = useQuery<ModuloRow[]>({
    queryKey: ['modulos-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('modulos')
        .select('id, codigo, nome, descricao, preco_mensal, ativo')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: pacotes = [], isLoading: loadingPacotes } = useQuery<PacoteRow[]>({
    queryKey: ['pacotes-comerciais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pacotes_comerciais')
        .select('id, nome, codigo, descricao, preco_total, desconto_percent, plano_id, modulos_inclusos, ativo')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((p: any) => ({ ...p, modulos_inclusos: p.modulos_inclusos || [] }));
    },
  });

  // ── Mutations ──
  const upsertModuloMutation = useMutation({
    mutationFn: async (payloads?: any[]) => {
      if (payloads) {
        // Inserção em lote para os módulos padrão
        for (const payload of payloads) {
          const { error } = await supabase.from('modulos').upsert(payload, { onConflict: 'codigo' });
          if (error) throw error;
        }
        return;
      }

      const nome = moduloForm.nome.trim();
      const codigo = moduloForm.codigo.trim();
      if (!nome || !codigo) throw new Error('Nome e código são obrigatórios');
      const preco = moduloForm.preco_mensal ? Number(moduloForm.preco_mensal.replace(',', '.')) : null;
      const payload = { nome, codigo, descricao: moduloForm.descricao.trim() || null, preco_mensal: preco, ativo: true };
      if (moduloForm.id) {
        const { error } = await supabase.from('modulos').update(payload).eq('id', moduloForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('modulos').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Módulo salvo');
      setModuloDialogOpen(false);
      resetModuloForm();
      queryClient.invalidateQueries({ queryKey: ['modulos-admin'] });
      queryClient.invalidateQueries({ queryKey: ['modulos'] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar módulo'),
  });

  const handleSeedModules = () => {
    toast.info('Inserindo módulos padrão...');
    upsertModuloMutation.mutate([
      { codigo: 'whatsapp', nome: 'WhatsApp Avançado', descricao: 'Envio de mensagens automáticas e configurações da Evolution API', preco_mensal: 0, ativo: true },
      { codigo: 'tv_avancada', nome: 'TV Premium', descricao: 'Animações e customizações exclusivas na tela da TV', preco_mensal: 0, ativo: true },
      { codigo: 'planilha', nome: 'Integração Planilha', descricao: 'Webhook e sincronização com Google Sheets no Histórico', preco_mensal: 0, ativo: true },
      { codigo: 'fila_pagamento', nome: 'Fila de Pagamento', descricao: 'Acesso à página de gestão de fila de senhas para pagamento', preco_mensal: 0, ativo: true }
    ]);
  };

  const toggleModuloMutation = useMutation({
    mutationFn: async (modulo: ModuloRow) => {
      const { error } = await supabase.from('modulos').update({ ativo: !modulo.ativo }).eq('id', modulo.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modulos-admin'] }),
  });

  const upsertPacoteMutation = useMutation({
    mutationFn: async () => {
      const nome = pacoteForm.nome.trim();
      const codigo = pacoteForm.codigo.trim();
      if (!nome || !codigo) throw new Error('Nome e código são obrigatórios');
      const preco = Number(pacoteForm.preco_total.replace(',', '.'));
      if (Number.isNaN(preco) || preco <= 0) throw new Error('Preço inválido');
      const desconto = pacoteForm.desconto_percent ? Number(pacoteForm.desconto_percent.replace(',', '.')) : null;
      const payload = {
        nome, codigo, descricao: pacoteForm.descricao.trim() || null,
        preco_total: preco, desconto_percent: desconto,
        plano_id: pacoteForm.plano_id || null, modulos_inclusos: pacoteForm.modulos_inclusos, ativo: true,
      };
      if (pacoteForm.id) {
        const { error } = await supabase.from('pacotes_comerciais').update(payload).eq('id', pacoteForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pacotes_comerciais').insert([payload]);
        if (error) throw error;
      }
      if (pacoteForm.plano_id) {
        await supabase.from('planos').update({ valor_base: preco }).eq('id', pacoteForm.plano_id);
      }
    },
    onSuccess: () => {
      toast.success('Pacote salvo');
      setPacoteDialogOpen(false);
      resetPacoteForm();
      queryClient.invalidateQueries({ queryKey: ['pacotes-comerciais'] });
      queryClient.invalidateQueries({ queryKey: ['planos'] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar pacote'),
  });

  const deletePacoteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pacotes_comerciais').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pacote removido');
      queryClient.invalidateQueries({ queryKey: ['pacotes-comerciais'] });
    },
  });

  // ── Helpers ──
  const resetModuloForm = () => setModuloForm({ id: '', nome: '', codigo: '', descricao: '', preco_mensal: '' });
  const resetPacoteForm = () => setPacoteForm({ id: '', nome: '', codigo: '', descricao: '', preco_total: '', desconto_percent: '', plano_id: '', modulos_inclusos: [] });

  const openEditModulo = (m: ModuloRow) => {
    setModuloForm({ id: m.id, nome: m.nome, codigo: m.codigo, descricao: m.descricao || '', preco_mensal: m.preco_mensal != null ? String(m.preco_mensal) : '' });
    setModuloDialogOpen(true);
  };

  const openEditPacote = (p: PacoteRow) => {
    setPacoteForm({
      id: p.id, nome: p.nome, codigo: p.codigo, descricao: p.descricao || '',
      preco_total: String(p.preco_total), desconto_percent: p.desconto_percent != null ? String(p.desconto_percent) : '',
      plano_id: p.plano_id || '', modulos_inclusos: p.modulos_inclusos || [],
    });
    setPacoteDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* ── MÓDULOS ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5" /> Módulos do Sistema
            </h3>
            <p className="text-sm text-muted-foreground">Cadastre funcionalidades que podem ser ativadas/desativadas por franquia</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleSeedModules} disabled={upsertModuloMutation.isPending}>
              {upsertModuloMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Package className="w-4 h-4 mr-1" />}
              Carregar Módulos Padrão
            </Button>
            <Button size="sm" onClick={() => { resetModuloForm(); setModuloDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Novo Módulo
            </Button>
          </div>
        </div>

        {loadingModulos ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : modulos.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum módulo cadastrado. Clique em "Novo Módulo" para começar.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modulos.map((m) => (
              <Card key={m.id} className={`relative transition-all ${m.ativo ? 'border-primary/40' : 'opacity-60 border-border'}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-semibold">{m.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{m.codigo}</p>
                    </div>
                    <Badge variant={m.ativo ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-wider">
                      {m.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {m.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{m.descricao}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-primary">
                      {m.preco_mensal != null ? `R$ ${m.preco_mensal.toFixed(2)}/mês` : 'Grátis'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditModulo(m)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Switch checked={!!m.ativo} onCheckedChange={() => toggleModuloMutation.mutate(m)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── PACOTES COMERCIAIS ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Pacotes Comerciais
            </h3>
            <p className="text-sm text-muted-foreground">Combine módulos em pacotes com preços e descontos</p>
          </div>
          <Button size="sm" onClick={() => { resetPacoteForm(); setPacoteDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Novo Pacote
          </Button>
        </div>

        {loadingPacotes ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : pacotes.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum pacote cadastrado.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pacotes.map((p) => {
              const planoNome = planos.find((pl) => pl.id === p.plano_id)?.nome;
              return (
                <Card key={p.id} className={`transition-all ${p.ativo ? 'border-primary/40' : 'opacity-60'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold">{p.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">{p.codigo}</p>
                      </div>
                      <Badge variant={p.ativo ? 'default' : 'secondary'} className="text-[10px] uppercase">
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-primary">R$ {p.preco_total.toFixed(2)}</span>
                      {p.desconto_percent ? <span className="text-xs text-green-600">-{p.desconto_percent}%</span> : null}
                    </div>
                    {planoNome && <p className="text-[11px] text-muted-foreground">Plano base: {planoNome}</p>}
                    {p.modulos_inclusos && p.modulos_inclusos.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.modulos_inclusos.map((cod) => {
                          const mod = modulos.find((m) => m.codigo === cod);
                          return (
                            <Badge key={cod} variant="outline" className="text-[10px]">
                              {mod ? mod.nome : cod}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditPacote(p)}>
                        <Pencil className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deletePacoteMutation.mutate(p.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Remover
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialog: Módulo ── */}
      <Dialog open={moduloDialogOpen} onOpenChange={setModuloDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{moduloForm.id ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); upsertModuloMutation.mutate(undefined); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={moduloForm.nome} onChange={(e) => setModuloForm({ ...moduloForm, nome: e.target.value })} placeholder="Ex: WhatsApp avançado" />
            </div>
            <div className="space-y-2">
              <Label>Código interno</Label>
              <Input value={moduloForm.codigo} onChange={(e) => setModuloForm({ ...moduloForm, codigo: e.target.value.toLowerCase() })} placeholder="ex: whatsapp_avancado" readOnly={!!moduloForm.id} />
            </div>
            <div className="space-y-2">
              <Label>Preço mensal (R$)</Label>
              <Input value={moduloForm.preco_mensal} onChange={(e) => setModuloForm({ ...moduloForm, preco_mensal: e.target.value })} placeholder="29,90" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={moduloForm.descricao} onChange={(e) => setModuloForm({ ...moduloForm, descricao: e.target.value })} placeholder="Descrição do módulo" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModuloDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsertModuloMutation.isPending}>
                {upsertModuloMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Pacote ── */}
      <Dialog open={pacoteDialogOpen} onOpenChange={setPacoteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{pacoteForm.id ? 'Editar Pacote' : 'Novo Pacote'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); upsertPacoteMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={pacoteForm.nome} onChange={(e) => setPacoteForm({ ...pacoteForm, nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={pacoteForm.codigo} onChange={(e) => setPacoteForm({ ...pacoteForm, codigo: e.target.value.toLowerCase() })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço total (R$)</Label>
                <Input value={pacoteForm.preco_total} onChange={(e) => setPacoteForm({ ...pacoteForm, preco_total: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Desconto %</Label>
                <Input value={pacoteForm.desconto_percent} onChange={(e) => setPacoteForm({ ...pacoteForm, desconto_percent: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano base</Label>
              <Select value={pacoteForm.plano_id} onValueChange={(v) => setPacoteForm({ ...pacoteForm, plano_id: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem plano</SelectItem>
                  {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Módulos inclusos</Label>
              <div className="flex flex-wrap gap-2">
                {modulos.map((m) => {
                  const checked = pacoteForm.modulos_inclusos.includes(m.codigo);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${checked ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
                        }`}
                      onClick={() => {
                        setPacoteForm((prev) => ({
                          ...prev,
                          modulos_inclusos: checked
                            ? prev.modulos_inclusos.filter((c) => c !== m.codigo)
                            : [...prev.modulos_inclusos, m.codigo],
                        }));
                      }}
                    >
                      {checked ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      {m.nome}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={pacoteForm.descricao} onChange={(e) => setPacoteForm({ ...pacoteForm, descricao: e.target.value })} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPacoteDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsertPacoteMutation.isPending}>
                {upsertPacoteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, DollarSign } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function SuperAdminFinanceiroTab({ franquias, unidades, planos, unidadesPlanos }: any) {
  const [financePeriodPreset, setFinancePeriodPreset] = React.useState<
    'mes_atual' | 'mes_anterior' | 'ano_atual' | 'ultimos_3_meses' | 'todo'
  >('mes_atual');
  const [financeStatusFilter, setFinanceStatusFilter] = React.useState<'todos' | 'ativo' | 'inadimplente'>('todos');
  const [financePlanoFilter, setFinancePlanoFilter] = React.useState<string>('todos');
  const [financeSearchFranquia, setFinanceSearchFranquia] = React.useState('');

  function getFinancePeriodRange(
    preset: 'mes_atual' | 'mes_anterior' | 'ano_atual' | 'ultimos_3_meses' | 'todo',
  ): { from: Date | null; to: Date | null } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (preset) {
      case 'mes_anterior': {
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const from = new Date(prevYear, prevMonth, 1);
        const to = new Date(prevYear, prevMonth + 1, 0);
        return { from, to };
      }
      case 'ano_atual': {
        const from = new Date(year, 0, 1);
        const to = new Date(year, 11, 31);
        return { from, to };
      }
      case 'ultimos_3_meses': {
        const from = new Date(year, month - 2, 1);
        const to = new Date(year, month + 1, 0);
        return { from, to };
      }
      case 'todo':
        return { from: null, to: null };
      case 'mes_atual':
      default: {
        const from = new Date(year, month, 1);
        const to = new Date(year, month + 1, 0);
        return { from, to };
      }
    }
  }

  const financePeriodRange = getFinancePeriodRange(financePeriodPreset);

  const novasFranquiasNoPeriodo = React.useMemo(() => {
    if (!financePeriodRange.from || !financePeriodRange.to) return franquias.length;
    return franquias.filter((f: any) => {
      if (!f.created_at) return false;
      const created = new Date(f.created_at);
      return created >= financePeriodRange.from! && created <= financePeriodRange.to!;
    }).length;
  }, [franquias, financePeriodRange.from, financePeriodRange.to]);

  const franquiasFinanceiro = franquias.map((f: any) => {
    const lojasDaFranquia = unidades.filter((u: any) => u.franquia_id === f.id);
    const lojasIds = lojasDaFranquia.map((u: any) => u.id);
    const planosDaFranquia = unidadesPlanos.filter(
      (up: any) => up.ativo && lojasIds.includes(up.unidade_id),
    );

    const faturamentoMensalBruto = planosDaFranquia.reduce((acc: number, up: any) => {
      const valor = Number(up.valor) || 0;
      const desconto = Number(up.desconto_percent) || 0;
      const valorComDesconto = valor * (1 - desconto / 100);
      return acc + valorComDesconto;
    }, 0);

    const cfg = (f.config_pagamento as any) || {};

    const descontoTipo = f.desconto_tipo || 'nenhum';
    const descontoValor = Number(f.desconto_valor || 0);
    const descontoPercentual = Number(f.desconto_percentual || 0);

    let faturamentoMensalEstimado = faturamentoMensalBruto;
    if (descontoTipo === 'percentual' && descontoPercentual > 0) {
      faturamentoMensalEstimado = faturamentoMensalBruto * (1 - descontoPercentual / 100);
    } else if (descontoTipo === 'valor' && descontoValor > 0) {
      faturamentoMensalEstimado = faturamentoMensalBruto - descontoValor;
    }
    if (faturamentoMensalEstimado < 0) faturamentoMensalEstimado = 0;

    return {
      id: f.id,
      nome: f.nome_franquia,
      lojas: lojasDaFranquia.length,
      faturamentoMensalEstimado,
      faturamentoTrimestralEstimado: faturamentoMensalEstimado * 3,
      faturamentoAnualEstimado: faturamentoMensalEstimado * 12,
      status_pagamento: f.status_pagamento,
      plano_id: cfg.plano_id as string | undefined,
      data_vencimento: f.data_vencimento,
      desconto_tipo: descontoTipo,
      desconto_valor: descontoValor,
      desconto_percentual: descontoPercentual,
      desconto_recorrente: f.desconto_recorrente ?? false,
    };
  });

  const franquiasFinanceiroFiltradas = franquiasFinanceiro.filter((f: any) => {
    if (financeStatusFilter !== 'todos' && f.status_pagamento !== financeStatusFilter) {
      return false;
    }

    if (financePlanoFilter !== 'todos' && f.plano_id !== financePlanoFilter) {
      return false;
    }

    if (financeSearchFranquia.trim()) {
      const term = financeSearchFranquia.toLowerCase();
      if (!f.nome.toLowerCase().includes(term)) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardHeader className="space-y-2 md:flex md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm font-mono">Filtros financeiros</CardTitle>
            <p className="text-xs text-muted-foreground">
              Ajuste o período, status e plano para analisar faturamento e franquias em atraso.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Período</Label>
              <Select
                value={financePeriodPreset}
                onValueChange={(v) =>
                  setFinancePeriodPreset(
                    v as 'mes_atual' | 'mes_anterior' | 'ano_atual' | 'ultimos_3_meses' | 'todo',
                  )
                }
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes_atual">Mês atual</SelectItem>
                  <SelectItem value="mes_anterior">Mês anterior</SelectItem>
                  <SelectItem value="ultimos_3_meses">Últimos 3 meses</SelectItem>
                  <SelectItem value="ano_atual">Ano atual</SelectItem>
                  <SelectItem value="todo">Todo histórico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs">Status</Label>
              <Select
                value={financeStatusFilter}
                onValueChange={(v) =>
                  setFinanceStatusFilter(v as 'todos' | 'ativo' | 'inadimplente')
                }
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativas</SelectItem>
                  <SelectItem value="inadimplente">Inadimplentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs">Plano</Label>
              <Select
                value={financePlanoFilter}
                onValueChange={(v) => setFinancePlanoFilter(v)}
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Todos os planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os planos</SelectItem>
                  {planos.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Buscar franquia"
              value={financeSearchFranquia}
              onChange={(e) => setFinanceSearchFranquia(e.target.value)}
              className="h-8 w-full text-xs md:w-48"
            />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Franquias ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">
              {franquias.filter((f: any) => f.status_pagamento === 'ativo').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Franquias inadimplentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold text-destructive">
              {franquias.filter((f: any) => f.status_pagamento === 'inadimplente').length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Novas franquias no período</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{novasFranquiasNoPeriodo}</p>
          </CardContent>
        </Card>

        {(() => {
          const totalMensal = franquiasFinanceiroFiltradas.reduce(
            (acc: number, f: any) => acc + (f.faturamentoMensalEstimado ?? 0),
            0,
          );
          const totalTrimestral = totalMensal * 3;
          const totalAnual = totalMensal * 12;

          return (
            <>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Faturamento mensal estimado</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono font-bold">
                    R$ {Number(totalMensal).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Faturamento trimestral est.</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono font-bold">
                    R$ {Number(totalTrimestral).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-mono">Faturamento anual est.</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-mono font-bold">
                    R$ {Number(totalAnual).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </>
          );
        })()}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono">Faturamento por franquia</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {franquiasFinanceiroFiltradas.length === 0 ? (
              <p className="mt-8 text-center text-sm text-muted-foreground">
                Nenhum dado de faturamento disponível com os filtros atuais.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={franquiasFinanceiroFiltradas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(v) => `R$ ${v}`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      `R$ ${Number((value as number | string | null) ?? 0).toFixed(2)}`,
                      'Faturamento mensal',
                    ]}
                  />
                  <Legend />
                  <Bar
                    dataKey="faturamentoMensalEstimado"
                    fill="hsl(var(--primary))"
                    name="Faturamento"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm font-mono">
              Resumo financeiro por franquia
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 overflow-auto">
            {franquiasFinanceiroFiltradas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma franquia encontrada com os filtros atuais.
              </p>
            ) : (
              <div className="grid gap-3 p-2 sm:grid-cols-2">
                {franquiasFinanceiroFiltradas.map((f: any) => (
                  <Card key={f.id} className="border border-border/60 bg-card/50 shadow-sm p-3 hover:bg-card transition-colors">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm leading-tight">{f.nome}</h4>
                          <p className="text-xs text-muted-foreground">{f.lojas} loja(s)</p>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${f.status_pagamento === 'ativo'
                            ? 'bg-status-available/10 text-status-available border-status-available/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                            }`}
                        >
                          {f.status_pagamento || '—'}
                        </span>
                      </div>

                      <Separator className="my-1" />

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Vencimento</p>
                          <p className="font-medium mt-0.5">
                            {f.data_vencimento
                              ? new Date(f.data_vencimento).toLocaleDateString('pt-BR')
                              : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-muted-foreground flex items-center justify-end gap-1"><DollarSign className="w-3 h-3" /> Mensal (est.)</p>
                          <p className="font-medium mt-0.5">
                            R$ {Number(f.faturamentoMensalEstimado ?? 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

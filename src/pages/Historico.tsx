import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout, BackButton } from '@/components/Layout';
import {
  fetchEntregadores,
  fetchHistoricoEntregas,
  deleteOldHistorico,
  HORARIO_EXPEDIENTE,
} from '@/lib/api';
import { toast } from 'sonner';
import { History, Download, Loader2, Users, Trash2, Clock, FileSpreadsheet, Copy, ArrowLeft } from 'lucide-react';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsDashboard } from '@/components/historico/AnalyticsDashboard';
import { format } from 'date-fns';

interface EntregadorContagem {
  id: string;
  nome: string;
  telefone: string;
  entregas: number;
}

const APP_SCRIPT_CODE = `// Google Apps Script - Cole este código no Editor de Script
// Acesse: https://script.google.com/home

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const unidade = data.unidade || "Geral";
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR");
    
    // 1. Lógica para Controle de Maquininhas
    if (data.tipo === "retirada_maquininha" || data.tipo === "devolucao_maquininha") {
      const sheetName = "(" + unidade + ") HORARIO MOTOBOY";
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["Data", "Motoboy", "Maquininha", "Check-in", "Retirada", "Devolução", "Tempo com máquina", "ID_VINCULO"]);
        sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#f3f3f3");
        sheet.setFrozenRows(1);
      }

      if (data.tipo === "retirada_maquininha") {
        const checkinTime = data.checkin ? new Date(data.checkin) : null;
        const retiradaTime = new Date(data.retirada);
        
        sheet.appendRow([
          dateStr, 
          data.motoboy, 
          data.maquininha, 
          checkinTime ? checkinTime : "--:--", 
          retiradaTime, 
          "", 
          "", 
          data.id_vinculo
        ]);
        
        const lastRow = sheet.getLastRow();
        if (checkinTime) sheet.getRange(lastRow, 4).setNumberFormat("HH:mm");
        sheet.getRange(lastRow, 5).setNumberFormat("HH:mm");
        sheet.hideColumns(8); // Oculta ID_VINCULO
      } 
      else if (data.tipo === "devolucao_maquininha") {
        const values = sheet.getDataRange().getValues();
        const idProcurado = data.id_vinculo;
        let found = false;
        
        for (let i = values.length - 1; i >= 1; i--) {
          if (values[i][7] == idProcurado) {
            const rowIdx = i + 1;
            const devolucaoTime = new Date(data.devolucao);
            
            const cellDevolucao = sheet.getRange(rowIdx, 6);
            cellDevolucao.setValue(devolucaoTime);
            cellDevolucao.setNumberFormat("HH:mm");
            
            const cellTempo = sheet.getRange(rowIdx, 7);
            cellTempo.setFormulaR1C1("=RC[-1]-RC[-2]");
            cellTempo.setNumberFormat("[h]:mm:ss");
            
            found = true;
            break;
          }
        }
      }
    } 
    // 2. Lógica para Saídas e Entregas (Tempo Real)
    else if (data.tipo === "saida_entrega") {
      const sheetName = "(" + unidade + ") Saidas e entregas";
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(["Data", "Horário", "Motoboy", "Entregas", "Bag", "Bebida"]);
        sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f3f3");
        sheet.setFrozenRows(1);
      }
      
      const horario = new Date(data.horario_saida || now);
      sheet.appendRow([
        dateStr,
        horario,
        data.motoboy,
        data.quantidade_entregas,
        data.bag,
        data.possui_bebida
      ]);
      sheet.getRange(sheet.getLastRow(), 2).setNumberFormat("HH:mm");
    }
    // 3. Lógica para Resumo Manual (Botão Sincronizar)
    else {
      const sheetName = unidade + '-' + data.data;
      let sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(['Nome', 'Telefone', 'Entregas']);
        sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground("#f3f3f3");
      }
      
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 3).clearContent();
      }
      
      if (data.entregas && data.entregas.length > 0) {
        const values = data.entregas.map(e => [e.nome, e.telefone, e.entregas]);
        sheet.getRange(2, 1, values.length, 3).setValues(values);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Para testar, publique como Web App:
// 1. Deploy > New deployment
// 2. Type: Web App
// 3. Execute as: Me
// 4. Who has access: Anyone
// 5. Copie a URL gerada e cole nas configurações do app
`;

export default function Historico() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Redirect if no unit selected
  if (!selectedUnit) {
    return <Navigate to="/" replace />;
  }

  const [dataInicio, setDataInicio] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [dataFim, setDataFim] = useState<Date>(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });

  const formatForInput = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Configurações da franquia para checar módulos ativos
  const { data: franquiaConfig } = useQuery<{ config_pagamento: any | null }>({
    queryKey: ['franquia-config-historico', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return { config_pagamento: null };
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || { config_pagamento: null };
    },
    enabled: !!user?.franquiaId,
  });

  const isPlanilhaAtivo = (franquiaConfig?.config_pagamento?.modulos_ativos || []).includes('planilha');
  const isAnalyticsProAtivo = (franquiaConfig?.config_pagamento?.modulos_ativos || []).includes('analytics_pro');

  // Query for fetching entregadores
  const { data: entregadores = [] } = useQuery({
    queryKey: ['entregadores', selectedUnit],
    queryFn: () => fetchEntregadores({ unidade: selectedUnit }),
  });

  // Buscar configuração da unidade para o webhook
  const { data: unitData } = useQuery({
    queryKey: ['unidade-config-sheets', selectedUnit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades')
        .select('config_sheets_url')
        .eq('id', user?.unidadeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.unidadeId,
  });

  useEffect(() => {
    if (unitData?.config_sheets_url) {
      setWebhookUrl(unitData.config_sheets_url);
    }
  }, [unitData]);

  // Query for fetching historico
  const { data: historico = [], isLoading } = useQuery({
    queryKey: ['historico', selectedUnit, dataInicio.toISOString()],
    queryFn: () =>
      fetchHistoricoEntregas({
        unidade: selectedUnit,
        dataInicio: dataInicio.toISOString(),
        dataFim: dataFim.toISOString(),
      }),
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Calcular contagem por entregador
  const contagemPorEntregador = useMemo((): EntregadorContagem[] => {
    const contagem: Record<string, number> = {};

    historico.forEach((h) => {
      contagem[h.entregador_id] = (contagem[h.entregador_id] || 0) + 1;
    });

    return entregadores
      .map((e) => ({
        id: e.id,
        nome: e.nome,
        telefone: e.telefone,
        entregas: contagem[e.id] || 0,
      }))
      .sort((a, b) => b.entregas - a.entregas);
  }, [historico, entregadores]);

  const totalEntregas = historico.length;

  // Verificar se pode limpar (após 12:00)
  const canClean = () => {
    const now = new Date();
    return now.getHours() >= 12;
  };

  const handleClean = async () => {
    if (!canClean()) {
      toast.error('A limpeza só pode ser feita após 12:00');
      return;
    }

    if (!confirm('Tem certeza que deseja limpar o histórico de ontem?')) {
      return;
    }

    try {
      await deleteOldHistorico(selectedUnit);
      queryClient.invalidateQueries({ queryKey: ['historico'] });
      toast.success('Histórico limpo com sucesso!');
    } catch (error) {
      toast.error('Erro ao limpar histórico');
    }
  };

  const handleExportExcel = () => {
    // Criar CSV para download
    const headers = ['Nome', 'Telefone', 'Entregas'];
    const rows = contagemPorEntregador.map((e) => [e.nome, e.telefone, e.entregas.toString()]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const dataFormatted = dataInicio.toLocaleDateString('pt-BR').replace(/\//g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `historico-entregas-${selectedUnit}-${dataFormatted}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Arquivo exportado com sucesso!');
  };

  const handleSaveWebhook = async () => {
    if (!user?.unidadeId) return;

    try {
      const { error } = await supabase
        .from('unidades')
        .update({ config_sheets_url: webhookUrl })
        .eq('id', user.unidadeId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['unidade-config-sheets'] });
      toast.success('URL do webhook salva na unidade!');
    } catch (error) {
      console.error('Erro ao salvar webhook:', error);
      toast.error('Erro ao salvar no banco de dados');
    }
  };

  const handleSyncToSheets = async () => {
    if (!webhookUrl) {
      toast.error('Configure a URL do webhook primeiro');
      setScriptDialogOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      const dataFormatted = dataInicio.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      const payload = {
        tipo: 'resumo_entregas',
        unidade: selectedUnit,
        data: dataFormatted,
        entregas: contagemPorEntregador.filter(e => e.entregas > 0),
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors', // Para evitar erro de CORS com Apps Script
      });

      toast.success('Dados enviados para a planilha!');
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar com a planilha');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(APP_SCRIPT_CODE);
    toast.success('Código copiado!');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <Layout>
      <Link
        to="/roteirista"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao Roteirista</span>
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-mono mb-2">Painel Analítico</h1>
          <p className="text-muted-foreground">
            Acompanhamento e contagem de entregas •{' '}
            <span className="font-semibold text-foreground">{selectedUnit}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          {canClean() && (
            <Button variant="outline" onClick={handleClean} className="gap-2 w-full sm:w-auto">
              <Trash2 className="w-4 h-4" />
              Limpar Ontem
            </Button>
          )}
          {isPlanilhaAtivo && (
            <>
              <Button variant="outline" onClick={() => setScriptDialogOpen(true)} className="gap-2 w-full sm:w-auto">
                <FileSpreadsheet className="w-4 h-4" />
                Config Planilha
              </Button>
              <Button variant="outline" onClick={handleSyncToSheets} disabled={isSyncing} className="gap-2 w-full sm:w-auto">
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                Sincronizar
              </Button>
            </>
          )}
          <Button onClick={handleExportExcel} className="gap-2 w-full sm:w-auto">
            <Download className="w-4 h-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="historico" className="w-full space-y-6">
        <div className="flex justify-between items-center mb-6 border-b pb-0">
          <TabsList className="bg-transparent border-0 h-auto p-0 justify-start w-full gap-6">
            <TabsTrigger
              value="historico"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3"
            >
              Histórico Padrão
            </TabsTrigger>
            {isAnalyticsProAtivo && (
              <TabsTrigger
                value="analytics"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 pb-3 font-semibold text-primary"
              >
                📊 Analytics Pro
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Período Customizado (Global para ambas as abas) */}
        <div className="bg-card border border-border rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Período Analisado</p>
              <p className="text-xs text-muted-foreground">Defina a janela exata de tempo</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="space-y-1 w-full sm:w-auto">
              <Label className="text-xs">Início</Label>
              <Input
                type="datetime-local"
                value={formatForInput(dataInicio)}
                onChange={(e) => {
                  if (e.target.value) setDataInicio(new Date(e.target.value));
                }}
                className="w-full sm:w-[200px]"
              />
            </div>
            <div className="space-y-1 w-full sm:w-auto">
              <Label className="text-xs">Fim</Label>
              <Input
                type="datetime-local"
                value={formatForInput(dataFim)}
                onChange={(e) => {
                  if (e.target.value) setDataFim(new Date(e.target.value));
                }}
                className="w-full sm:w-[200px]"
              />
            </div>
          </div>
        </div>

        <TabsContent value="historico" className="m-0 space-y-6">

          {/* Stats */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <History className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de saídas</p>
                  <p className="text-2xl font-bold font-mono">{totalEntregas}</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-status-available/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-status-available" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entregadores ativos</p>
                  <p className="text-2xl font-bold font-mono">
                    {contagemPorEntregador.filter((e) => e.entregas > 0).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : contagemPorEntregador.length === 0 ? (
            <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground mb-2">Nenhum registro encontrado</p>
              <p className="text-sm text-muted-foreground">
                Os registros de entregas aparecerão aqui durante o expediente
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View: Lista de cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {contagemPorEntregador.map((entregador, index) => (
                  <div key={entregador.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary text-muted-foreground flex items-center justify-center font-mono font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-base">{entregador.nome}</p>
                        <p className="text-sm text-muted-foreground">{entregador.telefone}</p>
                      </div>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center justify-center min-w-[2.5rem] px-3 h-9 rounded-full font-bold font-mono text-sm ${entregador.entregas > 0
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                          }`}
                      >
                        {entregador.entregas} entr
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Tabela */}
              <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Entregas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contagemPorEntregador.map((entregador, index) => (
                      <TableRow key={entregador.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{entregador.nome}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {entregador.telefone}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold font-mono ${entregador.entregas > 0
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-muted-foreground'
                              }`}
                          >
                            {entregador.entregas}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <AnalyticsDashboard dataInicio={dataInicio} dataFim={dataFim} />
        </TabsContent>
      </Tabs>

      {/* Script Dialog */}
      <Dialog open={scriptDialogOpen} onOpenChange={setScriptDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Configurar Google Sheets
            </DialogTitle>
            <DialogDescription>
              Configure a integração com Google Sheets para sincronizar os dados automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhook">URL do Web App (Google Apps Script)</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                />
                <Button onClick={handleSaveWebhook}>Salvar</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole aqui a URL gerada após publicar o Apps Script como Web App
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <Label>Instruções:</Label>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                <li>Crie uma nova planilha no Google Sheets</li>
                <li>Vá em Extensões {">"} Apps Script</li>
                <li>Cole o código abaixo no editor</li>
                <li>Clique em Deploy {">"} New deployment</li>
                <li>Selecione "Web App" como tipo</li>
                <li>Configure "Execute as" como "Me" e "Who has access" como "Anyone"</li>
                <li>Copie a URL gerada e cole no campo acima</li>
              </ol>
            </div>

            {/* Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Código do Apps Script:</Label>
                <Button variant="outline" size="sm" onClick={copyScript} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
              </div>
              <Textarea
                value={APP_SCRIPT_CODE}
                readOnly
                className="font-mono text-xs h-64"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              A planilha criará automaticamente as abas:
              <span className="font-mono font-semibold"> ({selectedUnit}) HORARIO MOTOBOY</span> e
              <span className="font-mono font-semibold"> ({selectedUnit}) Saidas e entregas</span>.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

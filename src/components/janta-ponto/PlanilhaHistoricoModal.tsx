import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchHistoricoPontoPlanilha,
  RegistroPontoIntervalo,
  FuncionarioInterno,
  sendPontoSheetsWebhook,
  getHojeLocalYMD
} from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Search,
  Filter,
  Clock,
  UtensilsCrossed,
  User,
  RefreshCw,
  FileText,
  Link as LinkIcon,
  Copy,
  Check,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface PlanilhaHistoricoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unidade: string;
  franquiaId?: string | null;
  funcionarios: FuncionarioInterno[];
}

type PeriodoPreset = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes_atual' | 'todos';

// Código pronto do Google Apps Script para o usuário colar na planilha
export const GOOGLE_APPS_SCRIPT_PONTO = `// =========================================================================
// GOOGLE APPS SCRIPT: CONTROLE DE JANTA & PONTO (EQUIPE INTERNA)
// =========================================================================
// Instruções de Instalação:
// 1. Abra sua planilha do Google
// 2. Clique no menu: Extensões > Apps Script
// 3. Cole este código no editor (substituindo tudo ou adicionando)
// 4. Clique em: "Implantar" > "Nova Implantação" (ou "Gerenciar Implantações > Nova Versão")
// 5. Selecione o tipo: "App da Web" (Web App)
// 6. "Executar como": "Eu (seu e-mail)"
// 7. "Quem pode acessar": "Qualquer pessoa" (OBRIGATÓRIO para funcionar)
// 8. Clique em "Implantar", copie o "URL do App da Web" (termina com /exec) e cole no sistema.

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sem dados no postData" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Planilha não vinculada" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const unidade = String(data.unidade || "Geral").toUpperCase();

    // =========================================================================
    // 1. JANTA & PONTO DA EQUIPE INTERNA
    // =========================================================================
    if (data.tipo === "ponto_intervalo_funcionario" || data.tipo === "checkin_funcionario" || data.tipo === "saida_janta" || data.tipo === "retorno_janta") {
      const sheetName = "(" + unidade + ") JANTA E PONTO";
      let sheet = ss.getSheetByName(sheetName);
      
      // Cria e formata a aba automaticamente caso ainda não exista
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow([
          "Data",
          "Funcionário",
          "Cargo",
          "Chegada (Check-in)",
          "Saída Janta",
          "Retorno Janta",
          "Tempo Total Janta (min)",
          "Status",
          "ID_FUNCIONARIO",
          "ID_REGISTRO"
        ]);
        
        // Estilização do Cabeçalho Ambar
        const headerRange = sheet.getRange(1, 1, 1, 10);
        headerRange.setFontWeight("bold")
                   .setBackground("#f59e0b")
                   .setFontColor("#000000");
        sheet.setFrozenRows(1);
      }
      
      const displayValues = sheet.getDataRange().getDisplayValues();
      const dateStr = String(data.data || new Date().toLocaleDateString("pt-BR")).trim();
      const funcNome = String(data.funcionario_nome || data.funcionario || "").trim().toLowerCase();
      const funcId = String(data.funcionario_id || "").trim();
      
      // Formata hora no padrão HH:mm
      function formatTime(isoStr) {
        if (!isoStr) return "";
        if (typeof isoStr === "string" && isoStr.length === 5 && isoStr.indexOf(":") === 2) return isoStr;
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return String(isoStr);
        const hh = ("0" + d.getHours()).slice(-2);
        const mm = ("0" + d.getMinutes()).slice(-2);
        return hh + ":" + mm;
      }
      
      // Localiza a linha existente do funcionário no dia para atualizar na MESMA LINHA
      let rowIndex = -1;
      for (let i = displayValues.length - 1; i >= 1; i--) {
        const row = displayValues[i];
        const rowDate = String(row[0]).trim();
        const rowFunc = String(row[1]).trim().toLowerCase();
        const rowFuncId = String(row[8]).trim();
        
        // Verifica se é o mesmo funcionário (por ID ou Nome)
        const isSameFunc = (funcId && rowFuncId === funcId) || (funcNome && rowFunc === funcNome);
        
        if (isSameFunc) {
          // Verifica se é da mesma data (ou se a linha é do mesmo dia)
          if (rowDate === dateStr || rowDate.indexOf(dateStr) !== -1 || dateStr.indexOf(rowDate) !== -1 || !rowDate) {
            rowIndex = i + 1; // Linha real no Google Sheets (1-indexed)
            break;
          }
        }
      }
      
      // Se não existir a linha hoje, adiciona uma nova linha (Check-in)
      if (rowIndex === -1) {
        const checkinFormatted = data.checkin ? formatTime(data.checkin) : formatTime(new Date().toISOString());
        sheet.appendRow([
          data.data || dateStr,
          data.funcionario_nome || data.funcionario || "",
          data.cargo || "-",
          checkinFormatted,
          data.saida_janta ? formatTime(data.saida_janta) : "",
          data.retorno_janta ? formatTime(data.retorno_janta) : "",
          data.tempo_total_minutos || 0,
          data.status === "em_janta" ? "Em Janta" : "Na Loja",
          funcId,
          data.id_registro || ""
        ]);
        
        const lastRow = sheet.getLastRow();
        sheet.getRange(lastRow, 4).setNumberFormat("@");
        sheet.getRange(lastRow, 5).setNumberFormat("@");
        sheet.getRange(lastRow, 6).setNumberFormat("@");
        sheet.hideColumns(9, 2); // Oculta colunas técnicas de IDs
      } else {
        // Atualiza na MESMA LINHA do dia existente
        if (data.cargo) sheet.getRange(rowIndex, 3).setValue(data.cargo);
        
        if (data.checkin && !sheet.getRange(rowIndex, 4).getValue()) {
          sheet.getRange(rowIndex, 4).setValue(formatTime(data.checkin));
        }
        if (data.saida_janta) {
          sheet.getRange(rowIndex, 5).setValue(formatTime(data.saida_janta));
          sheet.getRange(rowIndex, 8).setValue("Em Janta");
        }
        if (data.retorno_janta) {
          sheet.getRange(rowIndex, 6).setValue(formatTime(data.retorno_janta));
          sheet.getRange(rowIndex, 7).setValue(data.tempo_total_minutos || 0);
          sheet.getRange(rowIndex, 8).setValue("Na Loja");
        }
        if (data.status && !data.saida_janta && !data.retorno_janta) {
          sheet.getRange(rowIndex, 8).setValue(data.status === 'em_janta' ? 'Em Janta' : 'Na Loja');
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function PlanilhaHistoricoModal({
  open,
  onOpenChange,
  unidade,
  franquiaId,
  funcionarios,
}: PlanilhaHistoricoModalProps) {
  const [periodo, setPeriodo] = useState<PeriodoPreset>('7dias');
  const [filtroFuncionario, setFiltroFuncionario] = useState<string>('todos');
  const [buscaTexto, setBuscaTexto] = useState<string>('');

  // Integração Google Sheets
  const [showSheetsConfig, setShowSheetsConfig] = useState<boolean>(false);
  const [sheetsUrl, setSheetsUrl] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [testingWebhook, setTestingWebhook] = useState<boolean>(false);
  const [savingUrl, setSavingUrl] = useState<boolean>(false);

  // Carrega URL salva (da Franquia, Unidade ou LocalStorage) para sincronizar entre todas as lojas da mesma franquia
  useEffect(() => {
    if (!unidade && !franquiaId) return;

    // 1. Tenta recuperar do LocalStorage da franquia ou da unidade
    const localFranq = franquiaId ? localStorage.getItem(`filalab_ponto_sheets_url_franquia_${franquiaId}`) : '';
    const localUnidade = unidade ? localStorage.getItem(`filalab_ponto_sheets_url_${unidade}`) : '';
    if (localFranq) {
      setSheetsUrl(localFranq);
    } else if (localUnidade) {
      setSheetsUrl(localUnidade);
    }

    const carregarDoBanco = async () => {
      try {
        let urlEncontrada = '';

        // 1. Tenta carregar da franquia (compartilhada para todas as lojas)
        if (franquiaId) {
          const { data: franqData } = await supabase
            .from('franquias')
            .select('config_pagamento')
            .eq('id', franquiaId)
            .maybeSingle();

          const cfgFranq = (franqData?.config_pagamento as any) || {};
          if (cfgFranq.config_sheets_ponto_url) {
            urlEncontrada = cfgFranq.config_sheets_ponto_url;
            localStorage.setItem(`filalab_ponto_sheets_url_franquia_${franquiaId}`, urlEncontrada);
            if (unidade) localStorage.setItem(`filalab_ponto_sheets_url_${unidade}`, urlEncontrada);
          }
        }

        // 2. Se não achou na franquia, busca na unidade
        if (!urlEncontrada && unidade) {
          const { data: unitData } = await supabase
            .from('unidades')
            .select('config_whatsapp, franquia_id')
            .eq('slug', unidade)
            .maybeSingle();

          const cfg = (unitData?.config_whatsapp as any) || {};
          if (cfg.config_sheets_ponto_url) {
            urlEncontrada = cfg.config_sheets_ponto_url;
            localStorage.setItem(`filalab_ponto_sheets_url_${unidade}`, urlEncontrada);
          } else if (unitData?.franquia_id) {
            const { data: franqData } = await supabase
              .from('franquias')
              .select('config_pagamento')
              .eq('id', unitData.franquia_id)
              .maybeSingle();

            const cfgFranq = (franqData?.config_pagamento as any) || {};
            if (cfgFranq.config_sheets_ponto_url) {
              urlEncontrada = cfgFranq.config_sheets_ponto_url;
              localStorage.setItem(`filalab_ponto_sheets_url_franquia_${unitData.franquia_id}`, urlEncontrada);
              localStorage.setItem(`filalab_ponto_sheets_url_${unidade}`, urlEncontrada);
            }
          }
        }

        if (urlEncontrada) {
          setSheetsUrl(urlEncontrada);
        }
      } catch (err) {
        // Silencioso se offline
      }
    };

    if (open) {
      carregarDoBanco();
    }
  }, [unidade, franquiaId, open]);

  // Salvar Link do Google Sheets sincronizado na nuvem para todas as lojas da mesma franquia
  const handleSaveSheetsUrl = async () => {
    setSavingUrl(true);
    const urlLimpa = sheetsUrl.trim();
    try {
      if (unidade) localStorage.setItem(`filalab_ponto_sheets_url_${unidade}`, urlLimpa);
      if (franquiaId) localStorage.setItem(`filalab_ponto_sheets_url_franquia_${franquiaId}`, urlLimpa);

      let targetFranquiaId = franquiaId;

      // Se não temos franquiaId direto, descobre pela unidade
      if (!targetFranquiaId && unidade) {
        const { data: unitData } = await supabase
          .from('unidades')
          .select('franquia_id')
          .eq('slug', unidade)
          .maybeSingle();
        targetFranquiaId = unitData?.franquia_id;
      }

      // 1. Salva na franquia para que todas as lojas herdem automaticamente
      if (targetFranquiaId) {
        localStorage.setItem(`filalab_ponto_sheets_url_franquia_${targetFranquiaId}`, urlLimpa);

        const { data: franq } = await supabase
          .from('franquias')
          .select('config_pagamento')
          .eq('id', targetFranquiaId)
          .maybeSingle();

        const currentConfig = (franq?.config_pagamento as any) || {};
        await supabase
          .from('franquias')
          .update({
            config_pagamento: {
              ...currentConfig,
              config_sheets_ponto_url: urlLimpa,
            },
          })
          .eq('id', targetFranquiaId);

        // 2. Atualiza todas as unidades filhas da mesma franquia
        const { data: todasUnidades } = await supabase
          .from('unidades')
          .select('id, config_whatsapp')
          .eq('franquia_id', targetFranquiaId);

        if (todasUnidades && todasUnidades.length > 0) {
          for (const u of todasUnidades) {
            const uCfg = (u.config_whatsapp as any) || {};
            await supabase
              .from('unidades')
              .update({ config_whatsapp: { ...uCfg, config_sheets_ponto_url: urlLimpa } })
              .eq('id', u.id);
          }
        }
      } else if (unidade) {
        // Fallback para unidade individual se não houver franquia
        const { data: currentUnit } = await supabase
          .from('unidades')
          .select('config_whatsapp')
          .eq('slug', unidade)
          .maybeSingle();

        const currentConfig = (currentUnit?.config_whatsapp as any) || {};
        await supabase
          .from('unidades')
          .update({ config_whatsapp: { ...currentConfig, config_sheets_ponto_url: urlLimpa } })
          .eq('slug', unidade);
      }

      toast.success('Link da Planilha salvo e sincronizado para TODAS as lojas da franquia!');
    } catch (e) {
      toast.success('Link salvo com sucesso!');
    } finally {
      setSavingUrl(false);
    }
  };

  // Copiar Script do Apps Script
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_PONTO);
    setCopiedScript(true);
    toast.success('Código do Google Apps Script copiado!');
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // Testar envio para o Google Sheets
  const handleTestWebhook = async () => {
    const urlParaTestar = sheetsUrl.trim();
    if (!urlParaTestar || !urlParaTestar.startsWith('http')) {
      toast.error('Informe uma URL válida do Apps Script (iniciando com https://)');
      return;
    }
    setTestingWebhook(true);
    try {
      if (unidade) localStorage.setItem(`filalab_ponto_sheets_url_${unidade}`, urlParaTestar);
      if (franquiaId) localStorage.setItem(`filalab_ponto_sheets_url_franquia_${franquiaId}`, urlParaTestar);

      await sendPontoSheetsWebhook({
        tipo: 'ponto_intervalo_funcionario',
        acao: 'checkin',
        unidade,
        franquia_id: franquiaId,
        funcionario_id: 'teste_001',
        funcionario_nome: 'Funcionário Teste (FilaLab)',
        cargo: 'Pizzaiolo',
        data: getHojeLocalYMD(),
        checkin: new Date().toISOString(),
        status: 'trabalhando',
        customUrl: urlParaTestar,
      });
      toast.success('Sinal de teste enviado para o Google Planilhas! Verifique a aba na sua planilha.');
    } catch (e) {
      toast.error('Erro ao enviar teste para a planilha');
    } finally {
      setTestingWebhook(false);
    }
  };

  // Calcula datas de início e fim baseadas no preset
  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = new Date();
    const formatYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dia}`;
    };

    if (periodo === 'hoje') {
      const h = formatYMD(hoje);
      return { dataInicio: h, dataFim: h };
    }
    if (periodo === 'ontem') {
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);
      const o = formatYMD(ontem);
      return { dataInicio: o, dataFim: o };
    }
    if (periodo === '7dias') {
      const d7 = new Date(hoje);
      d7.setDate(hoje.getDate() - 6);
      return { dataInicio: formatYMD(d7), dataFim: formatYMD(hoje) };
    }
    if (periodo === '30dias') {
      const d30 = new Date(hoje);
      d30.setDate(hoje.getDate() - 29);
      return { dataInicio: formatYMD(d30), dataFim: formatYMD(hoje) };
    }
    if (periodo === 'mes_atual') {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { dataInicio: formatYMD(inicioMes), dataFim: formatYMD(hoje) };
    }
    return { dataInicio: undefined, dataFim: undefined };
  }, [periodo]);

  const { data: registros = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['planilha-ponto', unidade, dataInicio, dataFim, filtroFuncionario],
    queryFn: () =>
      fetchHistoricoPontoPlanilha({
        unidade,
        dataInicio,
        dataFim,
        funcionarioId: filtroFuncionario === 'todos' ? undefined : filtroFuncionario,
      }),
    enabled: open && !!unidade,
  });

  // Filtro em memória por busca de texto (nome ou cargo)
  const registrosFiltrados = useMemo(() => {
    if (!buscaTexto.trim()) return registros;
    const termo = buscaTexto.toLowerCase();
    return registros.filter((reg) => {
      const nome = reg.funcionario?.nome?.toLowerCase() || '';
      const cargo = reg.funcionario?.cargo?.toLowerCase() || '';
      return nome.includes(termo) || cargo.includes(termo);
    });
  }, [registros, buscaTexto]);

  // Estatísticas do período
  const stats = useMemo(() => {
    const total = registrosFiltrados.length;
    const comJanta = registrosFiltrados.filter((r) => (r.tempo_total_janta_minutos || 0) > 0);
    const somaMinutos = comJanta.reduce((acc, r) => acc + (r.tempo_total_janta_minutos || 0), 0);
    const mediaJantaMinutos = comJanta.length > 0 ? Math.round(somaMinutos / comJanta.length) : 0;

    return {
      total,
      comJantaCount: comJanta.length,
      mediaJantaMinutos,
    };
  }, [registrosFiltrados]);

  // Helpers de formatação
  const formatHora = (iso?: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatData = (dataYMD: string) => {
    if (!dataYMD) return '-';
    const [ano, mes, dia] = dataYMD.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Exportação para Excel (.xlsx)
  const handleExportXLSX = () => {
    if (registrosFiltrados.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    try {
      const dadosPlanilha = registrosFiltrados.map((reg) => ({
        'Data / Dia': formatData(reg.data_referencia),
        'Funcionário': reg.funcionario?.nome || 'Não identificado',
        'Cargo': reg.funcionario?.cargo || '-',
        'Horário Chegada (Check-in)': formatHora(reg.checkin_at),
        'Saída para Janta': formatHora(reg.saida_janta_at),
        'Retorno da Janta': formatHora(reg.retorno_janta_at),
        'Tempo Total de Janta (Min)': reg.tempo_total_janta_minutos || 0,
        'Status': reg.status === 'em_janta' ? 'Em Janta' : reg.status === 'trabalhando' ? 'Na Loja' : reg.status === 'finalizado' ? 'Finalizado' : 'Ausente',
        'Unidade': reg.unidade || unidade,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dadosPlanilha);

      const wscols = [
        { wch: 14 },
        { wch: 25 },
        { wch: 20 },
        { wch: 26 },
        { wch: 18 },
        { wch: 18 },
        { wch: 25 },
        { wch: 16 },
        { wch: 16 },
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Controle_Intervalos');

      const dataHoje = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Planilha_Intervalos_${unidade}_${dataHoje}.xlsx`);
      toast.success('Planilha Excel baixada com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao gerar arquivo Excel');
    }
  };

  // Exportação para CSV
  const handleExportCSV = () => {
    if (registrosFiltrados.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    try {
      const headers = [
        'Data',
        'Funcionario',
        'Cargo',
        'Horario_Chegada',
        'Saida_Janta',
        'Retorno_Janta',
        'Tempo_Total_Janta_Minutos',
        'Status',
        'Unidade'
      ];

      const rows = registrosFiltrados.map((reg) => [
        formatData(reg.data_referencia),
        `"${reg.funcionario?.nome || ''}"`,
        `"${reg.funcionario?.cargo || ''}"`,
        formatHora(reg.checkin_at),
        formatHora(reg.saida_janta_at),
        formatHora(reg.retorno_janta_at),
        reg.tempo_total_janta_minutos || 0,
        reg.status,
        `"${reg.unidade || unidade}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Intervalos_${unidade}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Arquivo CSV baixado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar CSV');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] bg-card border-border flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/80 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2.5 text-2xl font-bold font-mono text-foreground">
                <FileSpreadsheet className="w-6 h-6 text-amber-500" />
                Planilha de Ponto & Intervalos
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Relatório consolidado com horários de chegada, saída, retorno e tempo total de janta da equipe interna ({unidade}).
              </DialogDescription>
            </div>

            {/* Ações do Topo */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSheetsConfig(!showSheetsConfig)}
                className={`gap-1.5 border text-xs font-bold transition-all ${
                  sheetsUrl
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                {sheetsUrl ? 'Google Planilhas Conectado' : 'Vincular Google Planilhas'}
                {showSheetsConfig ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="gap-1.5 border-border"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-1.5 border-border"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                CSV
              </Button>
              <Button
                size="sm"
                onClick={handleExportXLSX}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Baixar Excel (.xlsx)
              </Button>
            </div>
          </div>

          {/* Painel Expansível de Integração Google Sheets / Apps Script */}
          {showSheetsConfig && (
            <div className="mt-4 p-4 rounded-2xl bg-background/80 border border-amber-500/30 space-y-3.5 animate-fade-in shadow-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-foreground">
                    Sincronização Automática com Google Planilhas (Apps Script)
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyScript}
                    className="h-8 text-xs bg-secondary/80 border-border hover:bg-secondary font-bold gap-1.5"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Script Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-amber-400" />
                        Copiar Script do Google Planilhas
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Input do Link Webhook */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>URL do Webhook do Google Apps Script (App da Web):</span>
                  <span className="text-[10px] text-amber-400 font-normal">
                    Cada ação (check-in, saída e volta de janta) atualizará na <strong>mesma linha do dia</strong>
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                      value={sheetsUrl}
                      onChange={(e) => setSheetsUrl(e.target.value)}
                      className="pl-8 h-9 text-xs bg-card border-border font-mono text-foreground"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSaveSheetsUrl}
                    disabled={savingUrl}
                    className="h-9 px-4 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                  >
                    {savingUrl ? 'Salvando...' : 'Salvar Link'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleTestWebhook}
                    disabled={testingWebhook || !sheetsUrl}
                    className="h-9 text-xs border-border gap-1"
                  >
                    <Zap className={`w-3.5 h-3.5 text-amber-400 ${testingWebhook ? 'animate-spin' : ''}`} />
                    Testar Envio
                  </Button>
                </div>
              </div>

              {/* Banner de Unificação por Franquia */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start gap-2.5">
                <span className="text-base leading-none">🔗</span>
                <div>
                  <strong className="text-amber-200">Planilha Unificada para toda a Franquia:</strong> Ao definir ou salvar a URL da planilha aqui, ela é aplicada automaticamente para <strong>todas as lojas da sua franquia</strong>. A planilha criará automaticamente uma aba separada e organizada para cada loja (ex: <code>({unidade.toUpperCase()}) JANTA E PONTO</code>).
                </div>
              </div>

              {/* Guia Rápido Passo a Passo */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 text-[11px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  Passo a Passo Rápido para Configurar:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 pt-0.5 text-muted-foreground">
                  <li>Clique no botão <strong>Copiar Script do Google Planilhas</strong> acima.</li>
                  <li>No seu Google Planilhas, clique em <strong>Extensões &gt; Apps Script</strong> e cole o código.</li>
                  <li>Clique em <strong>Implantar &gt; Nova Implantação</strong>, selecione <strong>App da Web</strong> e em "Quem pode acessar" coloque <strong>Qualquer pessoa</strong>.</li>
                  <li>Copie a <strong>URL do App da Web</strong> gerada, cole no campo acima e clique em <strong>Salvar Link</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Cards de Resumo */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="bg-background/60 border border-border/60 rounded-xl p-3">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                Total de Registros
              </span>
              <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                {stats.total}
              </p>
            </div>
            <div className="bg-background/60 border border-border/60 rounded-xl p-3">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                Intervalos de Janta
              </span>
              <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {stats.comJantaCount}
              </p>
            </div>
            <div className="bg-background/60 border border-border/60 rounded-xl p-3">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold">
                Média de Tempo de Janta
              </span>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                {stats.mediaJantaMinutos} min
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-border/50">
            {/* Presets de Período */}
            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/60 text-xs">
              {[
                { id: 'hoje', label: 'Hoje' },
                { id: 'ontem', label: 'Ontem' },
                { id: '7dias', label: '7 Dias' },
                { id: '30dias', label: '30 Dias' },
                { id: 'mes_atual', label: 'Mês Atual' },
                { id: 'todos', label: 'Todos' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodo(p.id as PeriodoPreset)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    periodo === p.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Filtro de Funcionário */}
            <select
              value={filtroFuncionario}
              onChange={(e) => setFiltroFuncionario(e.target.value)}
              className="bg-background/80 border border-border/60 text-xs rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="todos">Todos os Funcionários</option>
              {funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} ({f.cargo})
                </option>
              ))}
            </select>

            {/* Busca Rápida */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar por nome ou cargo..."
                value={buscaTexto}
                onChange={(e) => setBuscaTexto(e.target.value)}
                className="h-8 text-xs pl-8 bg-background/80 border-border/60"
              />
            </div>
          </div>
        </div>

        {/* Tabela / Planilha */}
        <div className="flex-1 overflow-auto p-6 max-h-[50vh]">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <p className="text-sm font-medium">Carregando planilha de registros...</p>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border border-dashed border-border/60 rounded-2xl">
              <UtensilsCrossed className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold text-foreground">Nenhum registro encontrado no período selecionado</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Os registros de check-in e saída/retorno de janta aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="border border-border/60 rounded-xl overflow-hidden bg-background/40">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                    <th className="py-3 px-4">Data / Dia</th>
                    <th className="py-3 px-4">Funcionário</th>
                    <th className="py-3 px-4">Cargo</th>
                    <th className="py-3 px-4 text-center">Chegada (Check-in)</th>
                    <th className="py-3 px-4 text-center">Saída Janta</th>
                    <th className="py-3 px-4 text-center">Retorno Janta</th>
                    <th className="py-3 px-4 text-center">Tempo Total Janta</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {registrosFiltrados.map((reg) => (
                    <tr
                      key={reg.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-foreground font-semibold">
                        {formatData(reg.data_referencia)}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground">
                        {reg.funcionario?.nome || 'Funcionário'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {reg.funcionario?.cargo || '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-400 font-bold">
                        {formatHora(reg.checkin_at)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">
                        {formatHora(reg.saida_janta_at)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-blue-400 font-bold">
                        {formatHora(reg.retorno_janta_at)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(reg.tempo_total_janta_minutos || 0) > 0 ? (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold font-mono">
                            {reg.tempo_total_janta_minutos} min
                          </Badge>
                        ) : reg.status === 'em_janta' ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            Jantando agora
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {reg.status === 'em_janta' ? (
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                            Em Janta
                          </Badge>
                        ) : reg.status === 'trabalhando' ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                            Na Loja
                          </Badge>
                        ) : reg.status === 'finalizado' ? (
                          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]">
                            Finalizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            Ausente
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

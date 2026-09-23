import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Printer,
  X,
  Sparkles,
  QrCode,
  Tag,
  CheckCircle2,
  Maximize2,
  Columns,
  Layers,
  FileText,
  LayoutGrid
} from 'lucide-react';
import {
  MODELOS_ETIQUETAS,
  ModeloEtiquetaId,
  TipoLayoutEtiqueta,
  formatarDataBR,
} from '@/lib/api-etiquetas';
import { toast } from 'sonner';

export interface DadosImpressaoEtiqueta {
  tipo: 'PRODUÇÃO' | 'DESCONGELAMENTO';
  produtoNome: string;
  categoria?: string;
  peso?: string | null;
  dataOperacao: string; // YYYY-MM-DD
  horaOperacao: string; // HH:mm
  dataValidade: string; // YYYY-MM-DD
  quantidade: number;
  unidade: string;
  usuarioNome: string;
  impressoraNome?: string;
  modeloEtiqueta?: ModeloEtiquetaId;
  colunas?: number;
  layout?: TipoLayoutEtiqueta;
}

interface EtiquetaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dados: DadosImpressaoEtiqueta | null;
  onConfirmPrint: (dadosCompletos: DadosImpressaoEtiqueta) => void;
}

export function EtiquetaPreviewModal({
  open,
  onOpenChange,
  dados,
  onConfirmPrint,
}: EtiquetaPreviewModalProps) {
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloEtiquetaId>('80x30');
  const [colunas, setColunas] = useState<number>(1);
  const [layoutSelecionado, setLayoutSelecionado] = useState<TipoLayoutEtiqueta>('completa');
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dados?.modeloEtiqueta) {
      setModeloSelecionado(dados.modeloEtiqueta);
      if (dados.colunas) {
        setColunas(dados.colunas);
      } else if (dados.modeloEtiqueta === '33x21') {
        setColunas(3); // Padrão mais comum no Brasil para 33x21mm
      } else {
        setColunas(1);
      }
    }
    if (dados?.layout) {
      setLayoutSelecionado(dados.layout);
    }
  }, [dados?.modeloEtiqueta, dados?.colunas, dados?.layout, open]);

  if (!dados) return null;

  const modeloInfo = MODELOS_ETIQUETAS.find((m) => m.id === modeloSelecionado) || MODELOS_ETIQUETAS[0];
  const isMini = modeloInfo.larguraMm <= 40;
  const isSimples = layoutSelecionado === 'simples';

  const handleModeloChange = (novoModelo: ModeloEtiquetaId) => {
    setModeloSelecionado(novoModelo);
    if (novoModelo === '33x21') {
      setColunas(3);
    } else if (novoModelo === '80x30' || novoModelo === '100x50') {
      setColunas(1);
    }
  };

  const handleImprimir = () => {
    setIsPrinting(true);

    try {
      // Cria janela de impressão dedicada para saída térmica exata
      const printWindow = window.open('', '_blank', 'width=650,height=450');
      if (!printWindow) {
        toast.error('O navegador bloqueou a janela de impressão. Permita popups para imprimir.');
        setIsPrinting(false);
        return;
      }

      const singleLabelHtml = `
        <div class="etiqueta-folha">
          <div class="etiqueta-box ${isSimples ? 'layout-simples-box' : ''}">
            ${!isSimples ? `
              <div class="header-tipo">
                <span class="tipo-titulo">${dados.tipo}</span>
                <span class="marca-titulo">FILALAB</span>
              </div>
            ` : ''}
            
            <div class="produto-nome ${isSimples ? 'produto-nome-simples' : ''}">${dados.produtoNome}</div>
            ${dados.peso ? `<div class="peso-badge ${isSimples ? 'peso-badge-simples' : ''}">PESO: ${dados.peso}</div>` : ''}
            
            <div class="datas-grid ${isSimples ? 'datas-grid-simples' : ''}">
              <div class="col-data">
                <span class="label-data">${isSimples ? 'DATA' : (dados.tipo === 'PRODUÇÃO' ? 'PRODUÇÃO' : 'DESCONGELADO')}</span>
                <span class="val-data">${formatarDataBR(dados.dataOperacao)}</span>
                <span class="val-hora">${dados.horaOperacao}</span>
              </div>
              <div class="col-validade">
                <span class="label-validade">VALIDADE</span>
                <span class="val-validade">${formatarDataBR(dados.dataValidade)}</span>
              </div>
            </div>

            ${!isSimples ? `
              <div class="footer-info">
                <span class="unidade-tag">${dados.unidade.toUpperCase()}</span>
                <span class="resp-tag">RESP: ${dados.usuarioNome.toUpperCase()}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      const labelsNaLinha = Array.from({ length: colunas })
        .map(() => singleLabelHtml)
        .join('');

      const copiasHtml = Array.from({ length: Math.max(1, dados.quantidade || 1) })
        .map(() => `
          <div class="linha-etiquetas">
            ${labelsNaLinha}
          </div>
        `)
        .join('');

      const gapMm = colunas > 1 ? 2 : 0;
      const larguraTotalMm = (modeloInfo.larguraMm * colunas) + (colunas > 1 ? (colunas - 1) * gapMm : 0);

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Impressão de Etiquetas - ${dados.produtoNome}</title>
            <style>
              @page {
                size: ${larguraTotalMm}mm ${modeloInfo.alturaMm}mm;
                margin: 0;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                background: #fff;
                color: #000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .linha-etiquetas {
                width: ${larguraTotalMm}mm;
                height: ${modeloInfo.alturaMm}mm;
                max-width: ${larguraTotalMm}mm;
                max-height: ${modeloInfo.alturaMm}mm;
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                align-items: stretch;
                gap: ${gapMm}mm;
                page-break-after: always;
                box-sizing: border-box;
                overflow: hidden;
              }
              .etiqueta-folha {
                width: ${modeloInfo.larguraMm}mm;
                height: ${modeloInfo.alturaMm}mm;
                max-width: ${modeloInfo.larguraMm}mm;
                max-height: ${modeloInfo.alturaMm}mm;
                padding: ${isMini ? '0.4mm 0.6mm' : '1.5mm 2.5mm'};
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
                overflow: hidden;
              }
              .etiqueta-box {
                width: 100%;
                height: 100%;
                border: ${isMini ? '1px solid #000' : '1.5px solid #000'};
                border-radius: ${isMini ? '1px' : '2px'};
                padding: ${isMini ? '0.5mm 0.7mm' : '1.5mm'};
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                overflow: hidden;
                box-sizing: border-box;
              }
              .layout-simples-box {
                justify-content: space-between;
                padding: ${isMini ? '0.6mm 0.8mm' : '2mm'};
              }
              .header-tipo {
                border-bottom: ${isMini ? '0.8px solid #000' : '1.5px solid #000'};
                padding-bottom: ${isMini ? '0.2mm' : '0.5mm'};
                margin-bottom: ${isMini ? '0.2mm' : '0.5mm'};
                display: flex;
                align-items: center;
                justify-content: space-between;
              }
              .tipo-titulo {
                font-size: ${isMini ? '5.2pt' : '8pt'};
                font-weight: 900;
                letter-spacing: ${isMini ? '0.2px' : '0.8px'};
              }
              .marca-titulo {
                font-size: ${isMini ? '4.8pt' : '7.5pt'};
                font-weight: 800;
              }
              .produto-nome {
                font-size: ${isMini ? '6.5pt' : '10.5pt'};
                font-weight: 900;
                line-height: ${isMini ? '1.05' : '1.1'};
                text-transform: uppercase;
                word-break: break-word;
                margin: ${isMini ? '0.2mm 0' : '0.5mm 0'};
                max-height: ${isMini ? '2.4em' : 'none'};
                overflow: hidden;
              }
              .produto-nome-simples {
                font-size: ${isMini ? '7.5pt' : '12pt'};
                line-height: 1.1;
                margin: ${isMini ? '0.3mm 0' : '0.8mm 0'};
              }
              .peso-badge {
                font-size: ${isMini ? '5pt' : '8.5pt'};
                font-weight: 800;
                background: #000;
                color: #fff;
                display: inline-block;
                padding: ${isMini ? '0.1mm 0.8mm' : '0.2mm 1.5mm'};
                border-radius: 1px;
                margin-bottom: ${isMini ? '0.2mm' : '0.5mm'};
                align-self: flex-start;
              }
              .peso-badge-simples {
                font-size: ${isMini ? '5.5pt' : '9pt'};
                margin: ${isMini ? '0.2mm 0' : '0.5mm 0'};
              }
              .datas-grid {
                display: flex;
                justify-content: space-between;
                border-top: ${isMini ? '0.6px dashed #000' : '1px dashed #000'};
                border-bottom: ${isMini ? '0.6px dashed #000' : '1px dashed #000'};
                padding: ${isMini ? '0.3mm 0' : '1mm 0'};
                margin: ${isMini ? '0.2mm 0' : '0.5mm 0'};
              }
              .datas-grid-simples {
                border-top: ${isMini ? '0.8px dashed #000' : '1.2px dashed #000'};
                border-bottom: none;
                padding: ${isMini ? '0.4mm 0 0 0' : '1mm 0 0 0'};
                margin-top: ${isMini ? '0.3mm' : '0.8mm'};
                margin-bottom: 0;
              }
              .col-data, .col-validade {
                display: flex;
                flex-direction: column;
              }
              .label-data, .label-validade {
                font-size: ${isMini ? '4pt' : '5.5pt'};
                font-weight: 800;
                color: #333;
                text-transform: uppercase;
              }
              .val-data {
                font-size: ${isMini ? '5.5pt' : '8.5pt'};
                font-weight: 900;
                letter-spacing: -0.2px;
              }
              .val-hora {
                font-size: ${isMini ? '4.5pt' : '6.5pt'};
                font-weight: 700;
              }
              .col-validade .val-validade {
                font-size: ${isMini ? (isSimples ? '7pt' : '6.5pt') : '9.5pt'};
                font-weight: 900;
              }
              .footer-info {
                display: flex;
                justify-content: space-between;
                font-size: ${isMini ? '4.5pt' : '6pt'};
                font-weight: 800;
                padding-top: ${isMini ? '0.2mm' : '0.5mm'};
              }
              .unidade-tag {
                letter-spacing: 0.3px;
              }
              .resp-tag {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 65%;
              }
            </style>
          </head>
          <body>
            ${copiasHtml}
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();

      // Confirma e registra no histórico
      onConfirmPrint({
        ...dados,
        modeloEtiqueta: modeloSelecionado,
        colunas,
        layout: layoutSelecionado,
      });

      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      toast.error('Ocorreu um erro ao gerar a impressão.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/80 rounded-3xl max-w-xl p-6 max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
                  Pré-visualização da Etiqueta
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Confira o layout exato antes de enviar para a impressora
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Configurações de Layout, Formato e Colunas */}
        <div className="space-y-3 p-3.5 rounded-2xl bg-secondary/50 border border-border/60 text-xs">
          {/* Seletor de Tipo / Modelo de Layout: Completa vs Simples */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
              <span>Tipo de Etiqueta:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full sm:w-[260px]">
              <button
                type="button"
                onClick={() => setLayoutSelecionado('completa')}
                className={`h-8 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  layoutSelecionado === 'completa'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Completa
              </button>

              <button
                type="button"
                onClick={() => setLayoutSelecionado('simples')}
                className={`h-8 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  layoutSelecionado === 'simples'
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Simples (Limpa)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Seletor de Tamanho */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Formato / Dimensão:</span>
              </div>
              <Select
                value={modeloSelecionado}
                onValueChange={(v) => handleModeloChange(v as ModeloEtiquetaId)}
              >
                <SelectTrigger className="w-full h-9 text-xs bg-card border-border font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS_ETIQUETAS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Colunas por Linha */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <Columns className="w-3.5 h-3.5 text-amber-400" />
                <span>Colunas por Carreira:</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setColunas(num)}
                    className={`h-9 rounded-xl text-xs font-bold transition-all border ${
                      colunas === num
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Simulador Fiel da Etiqueta Térmica */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center shadow-inner min-h-[220px]">
          <div className="flex items-center justify-between w-full mb-3 px-1 text-[10px] font-bold text-zinc-400">
            <span>
              Simulação Térmica • {modeloInfo.larguraMm}mm x {modeloInfo.alturaMm}mm
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700 text-[9px] uppercase font-mono">
                {layoutSelecionado === 'simples' ? 'Layout Simples' : 'Layout Completo'}
              </span>
              <span className="text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 text-[9px]">
                {colunas} {colunas === 1 ? 'Coluna' : 'Colunas'}
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto py-1">
            <div
              ref={printRef}
              className="flex items-stretch gap-2 justify-center mx-auto"
              style={{ minWidth: 'fit-content' }}
            >
              {Array.from({ length: colunas }).map((_, idx) => (
                <div
                  key={idx}
                  className={`bg-white text-black rounded-md border-2 border-black font-sans select-none shadow-2xl flex flex-col justify-between transition-all ${
                    isMini
                      ? colunas > 2
                        ? 'w-[140px] min-h-[128px] p-2 text-[9px]'
                        : colunas === 2
                        ? 'w-[175px] min-h-[135px] p-2.5'
                        : 'w-[230px] min-h-[146px] p-3'
                      : colunas > 1
                      ? 'w-[220px] min-h-[140px] p-2.5'
                      : 'w-full max-w-[340px] min-h-[145px] p-3'
                  }`}
                >
                  {/* Header: Tipo (Apenas no modo Completa) */}
                  {!isSimples && (
                    <div className={`flex items-center justify-between border-b-2 border-black ${isMini ? 'pb-0.5 mb-0.5' : 'pb-1 mb-1'}`}>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[7.5px]' : 'text-[9px]') : 'text-[10px]'} font-black tracking-wider uppercase`}>
                        {dados.tipo}
                      </span>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[7px]' : 'text-[8px]') : 'text-[9px]'} font-bold text-zinc-700`}>
                        FILALAB
                      </span>
                    </div>
                  )}

                  {/* Produto */}
                  <div className={isMini ? 'my-0.5' : (isSimples ? 'my-1.5' : 'my-1')}>
                    <h3 className={`${isMini ? (colunas > 2 ? 'text-[9.5px]' : 'text-xs') : (isSimples ? 'text-base font-black' : 'text-sm font-black')} uppercase leading-tight tracking-tight text-black line-clamp-2`}>
                      {dados.produtoNome}
                    </h3>
                    {dados.peso && (
                      <div className={`inline-block bg-black text-white ${isMini ? (colunas > 2 ? 'text-[6.5px] px-0.5 py-0' : 'text-[8px] px-1 py-0.5') : 'text-[10px] px-1.5 py-0.5'} font-extrabold rounded-sm mt-0.5`}>
                        PESO: {dados.peso}
                      </div>
                    )}
                  </div>

                  {/* Datas */}
                  <div className={`grid grid-cols-2 gap-1 ${isSimples ? 'border-t-2 border-dashed border-black pt-1 mt-1' : 'border-y border-dashed border-black py-1 my-1'} text-black`}>
                    <div>
                      <span className={`${isMini ? 'text-[5.5px]' : 'text-[7px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                        {isSimples ? 'DATA' : (dados.tipo === 'PRODUÇÃO' ? 'PRODUÇÃO' : 'DESCONGELADO')}
                      </span>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[7.5px]' : 'text-[9px]') : 'text-[11px]'} font-black font-mono block leading-tight`}>
                        {formatarDataBR(dados.dataOperacao)}
                      </span>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[6.5px]' : 'text-[8px]') : 'text-[9px]'} font-bold font-mono text-zinc-700 block leading-none mt-0.5`}>
                        Hora: {dados.horaOperacao}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`${isMini ? 'text-[5.5px]' : 'text-[7px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                        VALIDADE
                      </span>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[8.5px]' : 'text-[10px]') : 'text-[12px]'} font-black font-mono text-black block leading-tight`}>
                        {formatarDataBR(dados.dataValidade)}
                      </span>
                    </div>
                  </div>

                  {/* Footer (Apenas no modo Completa) */}
                  {!isSimples && (
                    <div className={`flex items-center justify-between ${isMini ? (colunas > 2 ? 'text-[6px]' : 'text-[7px]') : 'text-[8px]'} font-extrabold text-black pt-0.5`}>
                      <span className="uppercase tracking-wide">{dados.unidade}</span>
                      <span className={`uppercase truncate ${isMini ? (colunas > 2 ? 'max-w-[65px]' : 'max-w-[110px]') : 'max-w-[170px]'}`}>
                        RESP: {dados.usuarioNome}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Informações da Operação */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Quantidade / Saída</span>
            <span className="text-sm font-bold font-mono text-foreground">
              {dados.quantidade} {dados.quantidade === 1 ? 'linha' : 'linhas'} • Total {dados.quantidade * colunas} etiquetas
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Destino</span>
            <span className="text-sm font-bold text-foreground truncate block">
              {dados.impressoraNome || 'Impressora Padrão'}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
            className="rounded-xl h-11 px-4 border-border text-xs font-semibold"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleImprimir}
            disabled={isPrinting}
            className="rounded-xl h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md gap-2 flex-1"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? 'Preparando...' : `Imprimir ${dados.quantidade > 1 ? `(${dados.quantidade} linhas = ${dados.quantidade * colunas} etiq.)` : `(${colunas} etiquetas)`}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

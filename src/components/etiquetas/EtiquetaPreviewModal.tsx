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
  Maximize2
} from 'lucide-react';
import {
  MODELOS_ETIQUETAS,
  ModeloEtiquetaId,
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
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dados?.modeloEtiqueta) {
      setModeloSelecionado(dados.modeloEtiqueta);
    }
  }, [dados?.modeloEtiqueta, open]);

  if (!dados) return null;

  const modeloInfo = MODELOS_ETIQUETAS.find((m) => m.id === modeloSelecionado) || MODELOS_ETIQUETAS[0];
  const isMini = modeloInfo.larguraMm <= 40;

  const handleImprimir = () => {
    setIsPrinting(true);

    try {
      // Cria janela de impressão dedicada para saída térmica exata
      const printWindow = window.open('', '_blank', 'width=500,height=400');
      if (!printWindow) {
        toast.error('O navegador bloqueou a janela de impressão. Permita popups para imprimir.');
        setIsPrinting(false);
        return;
      }

      const copiasHtml = Array.from({ length: Math.max(1, dados.quantidade || 1) })
        .map(() => `
          <div class="etiqueta-folha">
            <div class="etiqueta-box">
              <div class="header-tipo">
                <span class="tipo-titulo">${dados.tipo}</span>
                <span class="marca-titulo">FILALAB</span>
              </div>
              <div class="produto-nome">${dados.produtoNome}</div>
              ${dados.peso ? `<div class="peso-badge">PESO: ${dados.peso}</div>` : ''}
              
              <div class="datas-grid">
                <div class="col-data">
                  <span class="label-data">${dados.tipo === 'PRODUÇÃO' ? 'PRODUÇÃO' : 'DESCONGELADO'}</span>
                  <span class="val-data">${formatarDataBR(dados.dataOperacao)}</span>
                  <span class="val-hora">${dados.horaOperacao}</span>
                </div>
                <div class="col-validade">
                  <span class="label-validade">VALIDADE</span>
                  <span class="val-validade">${formatarDataBR(dados.dataValidade)}</span>
                </div>
              </div>

              <div class="footer-info">
                <span class="unidade-tag">${dados.unidade.toUpperCase()}</span>
                <span class="resp-tag">RESP: ${dados.usuarioNome.toUpperCase()}</span>
              </div>
            </div>
          </div>
        `)
        .join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Impressão de Etiquetas - ${dados.produtoNome}</title>
            <style>
              @page {
                size: ${modeloInfo.larguraMm}mm ${modeloInfo.alturaMm}mm;
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
              .etiqueta-folha {
                width: ${modeloInfo.larguraMm}mm;
                height: ${modeloInfo.alturaMm}mm;
                max-width: ${modeloInfo.larguraMm}mm;
                max-height: ${modeloInfo.alturaMm}mm;
                padding: ${isMini ? '0.4mm 0.6mm' : '1.5mm 2.5mm'};
                page-break-after: always;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                overflow: hidden;
              }
              .etiqueta-box {
                width: 100%;
                height: 100%;
                border: ${isMini ? '1px solid #000' : '1.5px solid #000'};
                border-radius: ${isMini ? '1px' : '2px'};
                padding: ${isMini ? '0.6mm 0.8mm' : '1.5mm'};
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                overflow: hidden;
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
              .datas-grid {
                display: flex;
                justify-content: space-between;
                border-top: ${isMini ? '0.6px dashed #000' : '1px dashed #000'};
                border-bottom: ${isMini ? '0.6px dashed #000' : '1px dashed #000'};
                padding: ${isMini ? '0.3mm 0' : '1mm 0'};
                margin: ${isMini ? '0.2mm 0' : '0.5mm 0'};
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
                font-size: ${isMini ? '6.5pt' : '9.5pt'};
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
      <DialogContent className="bg-card border-border/80 rounded-3xl max-w-lg p-6 max-h-[92vh] overflow-y-auto">
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
          </div>
        </DialogHeader>

        {/* Seletor de Modelo de Etiqueta */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50 border border-border/60 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground font-medium">
            <Maximize2 className="w-4 h-4 text-amber-400" />
            <span>Formato da Etiqueta:</span>
          </div>
          <Select
            value={modeloSelecionado}
            onValueChange={(v) => setModeloSelecionado(v as ModeloEtiquetaId)}
          >
            <SelectTrigger className="w-[210px] h-8 text-xs bg-card border-border font-semibold">
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

        {/* Simulador Fiel da Etiqueta Térmica */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center shadow-inner min-h-[220px]">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">
            Simulação de Impressão Térmica • {modeloInfo.larguraMm}mm x {modeloInfo.alturaMm}mm
          </span>

          <div
            ref={printRef}
            className={`bg-white text-black rounded-md border-2 border-black font-sans select-none shadow-2xl flex flex-col justify-between transition-all ${
              isMini ? 'w-[230px] min-h-[146px] p-2.5' : 'w-full max-w-[340px] min-h-[145px] p-3'
            }`}
          >
            {/* Header: Tipo */}
            <div className={`flex items-center justify-between border-b-2 border-black ${isMini ? 'pb-0.5 mb-0.5' : 'pb-1 mb-1'}`}>
              <span className={`${isMini ? 'text-[9px]' : 'text-[10px]'} font-black tracking-wider uppercase`}>
                {dados.tipo}
              </span>
              <span className={`${isMini ? 'text-[8px]' : 'text-[9px]'} font-bold text-zinc-700`}>
                FILALAB
              </span>
            </div>

            {/* Produto */}
            <div className={isMini ? 'my-0.5' : 'my-1'}>
              <h3 className={`${isMini ? 'text-xs' : 'text-sm'} font-black uppercase leading-tight tracking-tight text-black line-clamp-2`}>
                {dados.produtoNome}
              </h3>
              {dados.peso && (
                <div className={`inline-block bg-black text-white ${isMini ? 'text-[8px] px-1 py-0.5' : 'text-[10px] px-1.5 py-0.5'} font-extrabold rounded-sm mt-0.5`}>
                  PESO: {dados.peso}
                </div>
              )}
            </div>

            {/* Datas */}
            <div className={`grid grid-cols-2 gap-2 border-y border-dashed border-black ${isMini ? 'py-1 my-0.5' : 'py-1.5 my-1'} text-black`}>
              <div>
                <span className={`${isMini ? 'text-[6px]' : 'text-[7px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                  {dados.tipo === 'PRODUÇÃO' ? 'PRODUÇÃO' : 'DESCONGELADO'}
                </span>
                <span className={`${isMini ? 'text-[9px]' : 'text-[11px]'} font-black font-mono block leading-tight`}>
                  {formatarDataBR(dados.dataOperacao)}
                </span>
                <span className={`${isMini ? 'text-[8px]' : 'text-[9px]'} font-bold font-mono text-zinc-700 block leading-none mt-0.5`}>
                  Hora: {dados.horaOperacao}
                </span>
              </div>
              <div className="text-right">
                <span className={`${isMini ? 'text-[6px]' : 'text-[7px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                  VALIDADE
                </span>
                <span className={`${isMini ? 'text-[10px]' : 'text-[12px]'} font-black font-mono text-black block leading-tight`}>
                  {formatarDataBR(dados.dataValidade)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between ${isMini ? 'text-[7px]' : 'text-[8px]'} font-extrabold text-black pt-0.5`}>
              <span className="uppercase tracking-wide">{dados.unidade}</span>
              <span className={`uppercase truncate ${isMini ? 'max-w-[110px]' : 'max-w-[170px]'}`}>
                RESP: {dados.usuarioNome}
              </span>
            </div>
          </div>
        </div>

        {/* Informações da Operação */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Quantidade</span>
            <span className="text-sm font-bold font-mono text-foreground">
              {dados.quantidade} {dados.quantidade === 1 ? 'etiqueta' : 'etiquetas'}
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
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 px-4 border-border text-xs font-semibold"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>

          <Button
            onClick={handleImprimir}
            disabled={isPrinting}
            className="rounded-xl h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md gap-2 flex-1"
          >
            <Printer className="w-4 h-4" />
            {isPrinting ? 'Preparando...' : `Imprimir ${dados.quantidade > 1 ? `(${dados.quantidade} cópias)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

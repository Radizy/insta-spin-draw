import {
  MODELOS_ETIQUETAS,
  ModeloEtiquetaId,
  TipoLayoutEtiqueta,
  formatarDataBR,
  updateEtiquetaUltimasPreferencias,
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
  quantidade: number; // Quantidade de vias deste item
  unidade: string;
  usuarioNome: string;
  impressoraNome?: string;
  modeloEtiqueta?: ModeloEtiquetaId;
  colunas?: number;
  layout?: TipoLayoutEtiqueta;
}

export function gerarHtmlItemEtiqueta(
  dados: DadosImpressaoEtiqueta,
  modeloId: ModeloEtiquetaId = '80x30',
  isSimples: boolean = false
): string {
  const isMini = modeloId === '33x21';

  return `
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
}

export function imprimirEtiquetasEmLote(
  itens: DadosImpressaoEtiqueta[],
  opcoesOverrides?: {
    modelo?: ModeloEtiquetaId;
    colunas?: number;
    layout?: TipoLayoutEtiqueta;
  }
): boolean {
  if (!itens || itens.length === 0) {
    toast.error('Nenhum item selecionado para impressão.');
    return false;
  }

  const primeiroItem = itens[0];
  const modeloId = opcoesOverrides?.modelo || primeiroItem.modeloEtiqueta || '80x30';
  const colunas = opcoesOverrides?.colunas || primeiroItem.colunas || (modeloId === '33x21' ? 3 : 1);
  const layout = opcoesOverrides?.layout || primeiroItem.layout || 'completa';
  const isSimples = layout === 'simples';
  const isMini = modeloId === '33x21';

  const modeloInfo =
    MODELOS_ETIQUETAS.find((m) => m.id === modeloId) ||
    MODELOS_ETIQUETAS[0];

  const gapMm = colunas > 1 ? 2 : 0;
  const larguraTotalMm =
    modeloInfo.larguraMm * colunas + (colunas > 1 ? (colunas - 1) * gapMm : 0);

  // Gera o HTML acumulado de todos os itens e suas respectivas vias/cópias
  let todasLinhasHtml = '';

  for (const item of itens) {
    const singleLabelHtml = gerarHtmlItemEtiqueta(item, modeloId, isSimples);
    const labelsNaLinha = Array.from({ length: colunas })
      .map(() => singleLabelHtml)
      .join('');

    const qtdVias = Math.max(1, item.quantidade || 1);
    const itemLinhas = Array.from({ length: qtdVias })
      .map(() => `
        <div class="linha-etiquetas">
          ${labelsNaLinha}
        </div>
      `)
      .join('');

    todasLinhasHtml += itemLinhas;
  }

  try {
    const printWindow = window.open('', '_blank', 'width=680,height=520');
    if (!printWindow) {
      toast.error('O navegador bloqueou a janela de impressão. Permita popups para imprimir diretamente.');
      return false;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Impressão de Etiquetas - FILALAB</title>
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
              font-size: ${isMini ? '9pt' : '15pt'};
              font-weight: 900;
              line-height: 1.1;
              margin: ${isMini ? '0.4mm 0' : '1mm 0'};
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
              font-size: ${isMini ? '7pt' : '11.5pt'};
              font-weight: 900;
              padding: ${isMini ? '0.2mm 1mm' : '0.4mm 2.5mm'};
              margin: ${isMini ? '0.3mm 0' : '0.8mm 0'};
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
              border-top: ${isMini ? '0.8px dashed #000' : '1.5px dashed #000'};
              border-bottom: none;
              padding: ${isMini ? '0.5mm 0 0 0' : '1.2mm 0 0 0'};
              margin-top: ${isMini ? '0.4mm' : '1mm'};
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
              font-size: ${isMini ? (isSimples ? '9.5pt' : '6.5pt') : (isSimples ? '15pt' : '9.5pt')};
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
          ${todasLinhasHtml}
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

    // Salva preferências no storage da unidade
    if (primeiroItem.unidade) {
      updateEtiquetaUltimasPreferencias(primeiroItem.unidade, {
        modelo: modeloId,
        colunas,
        layout,
      });
    }

    return true;
  } catch (err) {
    console.error('Erro ao gerar impressão térmica:', err);
    toast.error('Erro ao acionar a impressão.');
    return false;
  }
}

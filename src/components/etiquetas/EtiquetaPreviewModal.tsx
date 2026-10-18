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
  LayoutGrid,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  MODELOS_ETIQUETAS,
  ModeloEtiquetaId,
  TipoLayoutEtiqueta,
  formatarDataBR,
  updateEtiquetaUltimasPreferencias,
} from '@/lib/api-etiquetas';
import {
  DadosImpressaoEtiqueta,
  imprimirEtiquetasEmLote,
} from '@/lib/etiquetas-print';
import { toast } from 'sonner';

export type { DadosImpressaoEtiqueta };

interface EtiquetaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dados: DadosImpressaoEtiqueta | null;
  itens?: DadosImpressaoEtiqueta[];
  onConfirmPrint: (dadosCompletos: DadosImpressaoEtiqueta) => void;
  onConfirmPrintBatch?: (itensCompletos: DadosImpressaoEtiqueta[]) => void;
}

export function EtiquetaPreviewModal({
  open,
  onOpenChange,
  dados: dadosProps,
  itens = [],
  onConfirmPrint,
  onConfirmPrintBatch,
}: EtiquetaPreviewModalProps) {
  const [itemIndex, setItemIndex] = useState<number>(0);
  const temVariosItens = itens && itens.length > 1;
  const dados = (temVariosItens ? itens[itemIndex] : (itens[0] || dadosProps)) || dadosProps;

  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloEtiquetaId>('80x30');
  const [colunas, setColunas] = useState<number>(1);
  const [quantidade, setQuantidade] = useState<number>(1);
  const [layoutSelecionado, setLayoutSelecionado] = useState<TipoLayoutEtiqueta>('completa');
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItemIndex(0);
  }, [open, itens.length]);

  useEffect(() => {
    if (dados?.modeloEtiqueta) {
      setModeloSelecionado(dados.modeloEtiqueta);
      if (dados.colunas) {
        setColunas(dados.colunas);
      } else if (dados.modeloEtiqueta === '33x21') {
        setColunas(3);
      } else {
        setColunas(1);
      }
    }
    if (dados?.quantidade) {
      setQuantidade(dados.quantidade);
    } else {
      setQuantidade(1);
    }
    if (dados?.layout) {
      setLayoutSelecionado(dados.layout);
    }
  }, [dados?.modeloEtiqueta, dados?.colunas, dados?.layout, dados?.quantidade, open]);

  if (!dados) return null;

  const modeloInfo = MODELOS_ETIQUETAS.find((m) => m.id === modeloSelecionado) || MODELOS_ETIQUETAS[0];
  const isMini = modeloInfo.larguraMm <= 40;
  const is60x40 = modeloSelecionado === '60x40';
  const isSimples = layoutSelecionado === 'simples';

  const totalEtiquetasLote = temVariosItens
    ? itens.reduce((acc, it) => acc + (it.quantidade || 1), 0) * colunas
    : (quantidade || 1) * colunas;

  const handleModeloChange = (novoModelo: ModeloEtiquetaId) => {
    setModeloSelecionado(novoModelo);
    let novasColunas = colunas;
    if (novoModelo === '33x21') {
      novasColunas = 3;
      setColunas(3);
    } else if (novoModelo === '80x30' || novoModelo === '100x50' || novoModelo === '60x40') {
      novasColunas = 1;
      setColunas(1);
    }
    if (dados?.unidade) {
      updateEtiquetaUltimasPreferencias(dados.unidade, {
        modelo: novoModelo,
        colunas: novasColunas,
      });
    }
  };

  const handleColunasChange = (num: number) => {
    setColunas(num);
    if (dados?.unidade) {
      updateEtiquetaUltimasPreferencias(dados.unidade, { colunas: num });
    }
  };

  const handleLayoutChange = (lay: TipoLayoutEtiqueta) => {
    setLayoutSelecionado(lay);
    if (dados?.unidade) {
      updateEtiquetaUltimasPreferencias(dados.unidade, { layout: lay });
    }
  };

  const handleQuantidadeChange = (qtd: number) => {
    const validQtd = Math.max(1, Math.min(500, qtd));
    setQuantidade(validQtd);
    if (dados?.unidade) {
      updateEtiquetaUltimasPreferencias(dados.unidade, { quantidade: validQtd });
    }
  };

  const handleImprimir = () => {
    setIsPrinting(true);

    try {
      const listaParaImprimir: DadosImpressaoEtiqueta[] = temVariosItens
        ? itens.map((it) => ({
            ...it,
            modeloEtiqueta: modeloSelecionado,
            colunas,
            layout: layoutSelecionado,
          }))
        : [
            {
              ...dados,
              modeloEtiqueta: modeloSelecionado,
              colunas,
              layout: layoutSelecionado,
              quantidade,
            },
          ];

      const sucesso = imprimirEtiquetasEmLote(listaParaImprimir, {
        modelo: modeloSelecionado,
        colunas,
        layout: layoutSelecionado,
      });

      if (sucesso) {
        if (temVariosItens && onConfirmPrintBatch) {
          onConfirmPrintBatch(listaParaImprimir);
        } else {
          onConfirmPrint(listaParaImprimir[0]);
        }
        onOpenChange(false);
      }
    } catch (err) {
      console.error('Erro ao imprimir:', err);
      toast.error('Ocorreu um erro ao gerar a impressão.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-md border border-border/80 rounded-3xl max-w-2xl w-[95vw] p-5 sm:p-7 max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header Elegante (Sem botão duplicado de fechar) */}
        <DialogHeader className="space-y-1 pr-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
                Pré-visualização da Etiqueta Térmica
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Confira a simulação e ajuste o formato, colunas e cópias antes de imprimir
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Painel de Configurações da Etiqueta */}
        <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-3.5 text-xs">
          {/* Linha 1: Formato / Dimensão e Modo de Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Formato / Dimensão */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <div className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Formato / Dimensão:</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  {modeloInfo.larguraMm}x{modeloInfo.alturaMm}mm
                </span>
              </div>
              <Select
                value={modeloSelecionado}
                onValueChange={(v) => handleModeloChange(v as ModeloEtiquetaId)}
              >
                <SelectTrigger className="w-full h-10 text-xs bg-card border-border font-semibold rounded-xl px-3">
                  <SelectValue placeholder="Selecione formato..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {MODELOS_ETIQUETAS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs py-2 font-medium">
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Layout */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo de Layout:</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 h-10">
                <button
                  type="button"
                  onClick={() => handleLayoutChange('completa')}
                  className={`h-full rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    layoutSelecionado === 'completa'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black ring-1 ring-amber-400/50'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Completa
                </button>

                <button
                  type="button"
                  onClick={() => handleLayoutChange('simples')}
                  className={`h-full rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                    layoutSelecionado === 'simples'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black ring-1 ring-amber-400/50'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Simples (Limpa)
                </button>
              </div>
            </div>
          </div>

          {/* Linha 2: ETIQUETA POR LINHA e Quantidade de Impressões */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/50">
            {/* ETIQUETA POR LINHA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <div className="flex items-center gap-1.5">
                  <Columns className="w-3.5 h-3.5 text-amber-400" />
                  <span>ETIQUETA POR LINHA:</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {colunas} {colunas === 1 ? 'por linha' : 'lado a lado'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-10">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleColunasChange(num)}
                    className={`h-full rounded-xl text-xs font-bold transition-all border flex items-center justify-center ${
                      colunas === num
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black ring-1 ring-amber-400/50'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {num}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quantidade de Impressões */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-muted-foreground font-semibold">
                <div className="flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Qtd. de Impressões:</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  {quantidade * colunas} {quantidade * colunas === 1 ? 'etiqueta total' : 'etiquetas totais'}
                </span>
              </div>
              <div className="flex items-center gap-2 h-10">
                {/* Stepper com Input Dedicado */}
                <div className="flex items-center rounded-xl bg-card border border-border h-full p-1 shadow-sm shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuantidadeChange(quantidade - 1)}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={quantidade}
                    onChange={(e) => handleQuantidadeChange(Number(e.target.value) || 1)}
                    className="h-8 w-12 bg-transparent font-mono font-black text-center text-xs text-foreground focus:outline-none"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuantidadeChange(quantidade + 1)}
                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Presets Rápidos */}
                <div className="grid grid-cols-4 gap-1 flex-1 h-full">
                  {[1, 2, 5, 10].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuantidadeChange(preset)}
                      className={`h-full rounded-xl text-xs font-mono font-bold border transition-all ${
                        quantidade === preset
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
                          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seletor de Item no Lote (quando há múltiplos itens selecionados) */}
        {temVariosItens && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Badge className="bg-blue-500 text-slate-950 font-bold shrink-0">
                Lote ({itens.length} itens)
              </Badge>
              <span className="font-semibold text-foreground truncate">
                Item <strong className="text-blue-400 font-mono">{itemIndex + 1} de {itens.length}</strong>: {dados.produtoNome} ({dados.quantidade} {dados.quantidade === 1 ? 'via' : 'vias'})
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={itemIndex === 0}
                onClick={() => setItemIndex((prev) => Math.max(0, prev - 1))}
                className="h-8 w-8 p-0 rounded-xl border-border bg-card"
                title="Item anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={itemIndex >= itens.length - 1}
                onClick={() => setItemIndex((prev) => Math.min(itens.length - 1, prev + 1))}
                className="h-8 w-8 p-0 rounded-xl border-border bg-card"
                title="Próximo item"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Simulador Fiel da Etiqueta Térmica */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-zinc-950 via-zinc-900/90 to-zinc-950 border border-zinc-800 flex flex-col items-center justify-center shadow-inner min-h-[220px] relative">
          {/* Barra de Status da Simulação */}
          <div className="flex items-center justify-between w-full mb-3.5 px-1 text-[10px] font-bold text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Simulação Térmica • {modeloInfo.larguraMm}mm x {modeloInfo.alturaMm}mm</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-300 bg-zinc-800/80 px-2.5 py-0.5 rounded-full border border-zinc-700 text-[9px] uppercase font-mono">
                {layoutSelecionado === 'simples' ? 'Layout Simples' : 'Layout Completo'}
              </span>
              <span className="text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 text-[9px] font-mono">
                {colunas} {colunas === 1 ? 'Etiqueta por Linha' : 'Etiquetas por Linha'}
              </span>
            </div>
          </div>

          {/* Área de Visualização com Scroll Horizontal para Multicolunas */}
          <div className="w-full overflow-x-auto py-2">
            <div
              ref={printRef}
              className="flex items-stretch gap-3 justify-center mx-auto"
              style={{ minWidth: 'fit-content' }}
            >
              {Array.from({ length: colunas }).map((_, idx) => (
                <div
                  key={idx}
                  className={`bg-white text-zinc-950 rounded-lg border-2 border-zinc-950 font-sans select-none shadow-2xl flex flex-col justify-between transition-all relative overflow-hidden ${
                    isMini
                      ? colunas > 2
                        ? 'w-[145px] min-h-[118px] p-2'
                        : colunas === 2
                        ? 'w-[170px] min-h-[125px] p-2.5'
                        : 'w-[210px] min-h-[135px] p-3'
                      : is60x40
                      ? colunas > 1
                        ? 'w-[210px] min-h-[155px] p-2.5'
                        : 'w-[280px] min-h-[190px] p-3.5'
                      : colunas > 1
                      ? 'w-[230px] min-h-[135px] p-2.5'
                      : 'w-full max-w-[360px] min-h-[145px] p-3.5'
                  }`}
                >
                  {/* Header: Tipo (Apenas no modo Completa) */}
                  {!isSimples && (
                    <div className={`flex items-center justify-between border-b-2 border-black font-mono ${isMini ? 'pb-0.5 mb-0.5' : 'pb-1 mb-1'}`}>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[7.5px]' : 'text-[8.5px]') : 'text-[10px]'} font-black tracking-wider uppercase`}>
                        {dados.tipo}
                      </span>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[7px]' : 'text-[8px]') : 'text-[9px]'} font-extrabold text-zinc-700`}>
                        FILALAB
                      </span>
                    </div>
                  )}

                  {/* Produto */}
                  <div className={isMini ? 'my-0.5' : (isSimples ? 'my-1' : 'my-0.5')}>
                    <h3 className={`${
                      isMini 
                        ? (colunas > 2 ? (isSimples ? 'text-[10px] font-black' : 'text-[9.5px]') : (isSimples ? 'text-xs font-black' : 'text-[11px] font-bold'))
                        : (isSimples ? 'text-base font-black' : 'text-sm font-black')
                    } uppercase leading-tight tracking-tight text-black line-clamp-2`}>
                      {dados.produtoNome}
                    </h3>
                    {dados.peso && (
                      <div className={`inline-block bg-black text-white ${isMini ? (colunas > 2 ? 'text-[6.5px] px-1 py-0' : 'text-[8px] px-1 py-0.5') : (isSimples ? 'text-[10px] px-1.5 py-0.5' : 'text-[9.5px] px-1.5 py-0.5')} font-extrabold rounded-sm mt-1`}>
                        PESO: {dados.peso}
                      </div>
                    )}
                  </div>

                  {/* Datas */}
                  <div className={`grid grid-cols-2 gap-1.5 ${isSimples ? 'border-t-2 border-dashed border-black/80 pt-1.5 mt-1' : 'border-y border-dashed border-black/80 py-1 my-1'} text-black`}>
                    <div>
                      <span className={`${isMini ? 'text-[5.5px]' : 'text-[7px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                        {isSimples ? 'FABRICAÇÃO' : (dados.tipo === 'PRODUÇÃO' ? 'PRODUÇÃO' : 'DESCONGELADO')}
                      </span>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[7.5px]' : 'text-[9px]') : (isSimples ? 'text-xs' : 'text-[11px]')} font-black font-mono block leading-tight`}>
                        {formatarDataBR(dados.dataOperacao)}
                      </span>
                      {!isSimples && (
                        <span className={`${isMini ? (colunas > 2 ? 'text-[6.5px]' : 'text-[8px]') : 'text-[9px]'} font-bold font-mono text-zinc-700 block leading-none mt-0.5`}>
                          Hora: {dados.horaOperacao}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`${isMini ? 'text-[6px]' : 'text-[7.5px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                        VALIDADE
                      </span>
                      <span className={`${isMini ? (colunas > 2 ? 'text-[9px]' : 'text-[11px]') : (isSimples ? 'text-sm font-black' : 'text-[12px]')} font-black font-mono text-black block leading-tight`}>
                        {formatarDataBR(dados.dataValidade)}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé da Etiqueta */}
                  {isSimples ? (
                    /* Simulação de Código Térmico no Modo Simples */
                    <div className="flex items-center justify-between pt-0.5 border-t border-zinc-300 text-[6.5px] font-mono text-zinc-500">
                      <span>FILALAB TÉRMICA</span>
                      <div className="flex items-center gap-[2px] h-2.5 opacity-60">
                        <span className="w-[1.5px] h-full bg-black block" />
                        <span className="w-[1px] h-full bg-black block" />
                        <span className="w-[2px] h-full bg-black block" />
                        <span className="w-[1px] h-full bg-black block" />
                        <span className="w-[1.5px] h-full bg-black block" />
                      </div>
                    </div>
                  ) : (
                    /* Footer no Modo Completa */
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

        {/* Informações da Operação (Cards de Resumo) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Resumo do Volume</span>
              <span className="text-sm font-bold font-mono text-foreground">
                {totalEtiquetasLote} {totalEtiquetasLote === 1 ? 'etiqueta' : 'etiquetas no total'}
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
              {temVariosItens ? `${itens.length} itens` : `${quantidade} cópias`} ({colunas}x)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-secondary/40 border border-border/70 flex items-center justify-between">
            <div className="truncate pr-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold block">Destino Térmico</span>
              <span className="text-sm font-bold text-foreground truncate block">
                {dados.impressoraNome || 'Impressora Elgin Térmica'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-lg border border-emerald-400/20 shrink-0">
              Pronta
            </span>
          </div>
        </div>

        {/* Rodapé com Botões de Ação */}
        <DialogFooter className="flex-col sm:flex-row gap-2 mt-1">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenChange(false);
            }}
            className="rounded-2xl h-12 px-5 border-border text-xs font-bold hover:bg-secondary"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleImprimir}
            disabled={isPrinting}
            className="rounded-2xl h-12 px-6 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 gap-2 flex-1 transition-all active:scale-[0.99]"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            {isPrinting
              ? 'Preparando Saída...'
              : temVariosItens
              ? `Imprimir ${itens.length} Itens (${totalEtiquetasLote} ${totalEtiquetasLote === 1 ? 'etiqueta' : 'etiquetas'})`
              : `Imprimir (${quantidade * colunas} ${quantidade * colunas === 1 ? 'etiqueta' : 'etiquetas'})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

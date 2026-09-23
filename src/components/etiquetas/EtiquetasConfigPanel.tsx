import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  Tag,
  Sparkles,
  Columns,
  Maximize2,
  FileText,
  Save,
  Plus,
  Trash2,
  Edit,
  Wifi,
  SlidersHorizontal,
} from 'lucide-react';
import {
  MODELOS_ETIQUETAS,
  ModeloEtiquetaId,
  TipoLayoutEtiqueta,
  EtiquetaConfigLoja,
  EtiquetaImpressora,
  fetchEtiquetaConfigLoja,
  saveEtiquetaConfigLoja,
  fetchEtiquetaImpressoras,
  deleteEtiquetaImpressora,
  formatarDataBR,
  getHoraAtualHHMM,
} from '@/lib/api-etiquetas';
import { CadastroImpressoraModal } from '@/components/etiquetas/CadastroImpressoraModal';
import { toast } from 'sonner';

export function EtiquetasConfigPanel() {
  const { selectedUnit } = useUnit();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modal de cadastro/edição de impressora
  const [modalImpressoraOpen, setModalImpressoraOpen] = useState(false);
  const [impressoraEditando, setImpressoraEditando] = useState<EtiquetaImpressora | null>(null);

  // 1. Carrega configurações de etiquetas da loja ativa
  const {
    data: configLoja,
    refetch: refetchConfig,
  } = useQuery({
    queryKey: ['etiquetas-config-loja', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchEtiquetaConfigLoja(selectedUnit, user?.franquiaId) : null),
    enabled: !!selectedUnit,
  });

  // 2. Carrega impressoras térmicas da loja ativa
  const {
    data: impressoras = [],
    refetch: refetchImpressoras,
  } = useQuery({
    queryKey: ['etiquetas-impressoras', selectedUnit, user?.franquiaId],
    queryFn: () => (selectedUnit ? fetchEtiquetaImpressoras(selectedUnit, user?.franquiaId) : []),
    enabled: !!selectedUnit,
  });

  // Estados locais do formulário de configuração da loja
  const [impressoraPadraoId, setImpressoraPadraoId] = useState<string>('');
  const [modeloPadrao, setModeloPadrao] = useState<ModeloEtiquetaId>('80x30');
  const [colunasPadrao, setColunasPadrao] = useState<number>(1);
  const [layoutPadrao, setLayoutPadrao] = useState<TipoLayoutEtiqueta>('completa');

  // Sincroniza estados quando os dados da loja carregarem
  useEffect(() => {
    if (configLoja) {
      setModeloPadrao(configLoja.modelo_padrao || '80x30');
      setColunasPadrao(configLoja.colunas_padrao || (configLoja.modelo_padrao === '33x21' ? 3 : 1));
      setLayoutPadrao(configLoja.layout_padrao || 'completa');
      if (configLoja.impressora_padrao_id) {
        setImpressoraPadraoId(configLoja.impressora_padrao_id);
      }
    }
  }, [configLoja]);

  // Se não houver impressora selecionada mas houver uma cadastrada, define a primeira
  useEffect(() => {
    if (!impressoraPadraoId && impressoras.length > 0) {
      const ativa = impressoras.find((i) => i.ativa) || impressoras[0];
      setImpressoraPadraoId(ativa.id);
    }
  }, [impressoras, impressoraPadraoId]);

  // Mutation para salvar as configurações da loja
  const salvarConfigMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUnit) throw new Error('Selecione uma loja.');
      const payload: EtiquetaConfigLoja = {
        unidade: selectedUnit,
        franquia_id: user?.franquiaId,
        impressora_padrao_id: impressoraPadraoId,
        modelo_padrao: modeloPadrao,
        colunas_padrao: colunasPadrao,
        layout_padrao: layoutPadrao,
      };
      return saveEtiquetaConfigLoja(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-config-loja', selectedUnit] });
      toast.success(`Configurações de etiqueta salvas para a loja ${selectedUnit}!`);
    },
    onError: () => {
      toast.error('Erro ao salvar as configurações de etiqueta da loja.');
    },
  });

  // Mutation para excluir impressora
  const excluirImpressoraMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!selectedUnit) return;
      return deleteEtiquetaImpressora(id, selectedUnit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etiquetas-impressoras', selectedUnit] });
      toast.success('Impressora removida com sucesso');
    },
    onError: () => toast.error('Erro ao excluir impressora'),
  });

  const modeloInfo = useMemo(() => {
    return MODELOS_ETIQUETAS.find((m) => m.id === modeloPadrao) || MODELOS_ETIQUETAS[0];
  }, [modeloPadrao]);

  const isMini = modeloInfo.larguraMm <= 40;
  const isSimples = layoutPadrao === 'simples';

  const handleModeloChange = (novoModelo: ModeloEtiquetaId) => {
    setModeloPadrao(novoModelo);
    if (novoModelo === '33x21') {
      setColunasPadrao(3);
    } else if (novoModelo === '80x30' || novoModelo === '100x50') {
      setColunasPadrao(1);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Cabeçalho da Unidade */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-card border border-border/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold font-mono text-foreground tracking-tight">
                Padrões de Etiquetas da Loja
              </h2>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs font-bold font-mono">
                {selectedUnit}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Defina o tamanho, número de colunas, impressora e layout padrão para esta unidade
            </p>
          </div>
        </div>

        <Button
          onClick={() => salvarConfigMutation.mutate()}
          disabled={salvarConfigMutation.isPending}
          className="rounded-2xl h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 gap-2"
        >
          <Save className="w-4 h-4" />
          {salvarConfigMutation.isPending ? 'Salvando...' : 'Salvar Padrões da Loja'}
        </Button>
      </div>

      {/* Grid Principal de Configuração */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Parâmetros Padrão */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-5">
            <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-400" />
              Parâmetros Padrão de Impressão
            </h3>

            {/* 1. Impressora Padrão */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Impressora Térmica Principal</Label>
              <Select value={impressoraPadraoId} onValueChange={setImpressoraPadraoId}>
                <SelectTrigger className="h-11 rounded-xl bg-card border-border text-xs font-semibold">
                  <SelectValue placeholder="Selecione a impressora padrão da loja..." />
                </SelectTrigger>
                <SelectContent>
                  {impressoras.map((imp) => (
                    <SelectItem key={imp.id} value={imp.id} className="text-xs">
                      {imp.nome} <span className="text-muted-foreground ml-1">({imp.modelo} - {imp.ip}:{imp.porta})</span>
                    </SelectItem>
                  ))}
                  {impressoras.length === 0 && (
                    <SelectItem value="sem-impressora" disabled className="text-xs">
                      Nenhuma impressora cadastrada nesta loja
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Tamanho / Modelo de Etiqueta Padrão */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Formato / Tamanho Padrão</Label>
                <span className="text-[11px] text-amber-400 font-mono font-semibold">
                  {modeloInfo.larguraMm}mm x {modeloInfo.alturaMm}mm
                </span>
              </div>
              <Select value={modeloPadrao} onValueChange={(v) => handleModeloChange(v as ModeloEtiquetaId)}>
                <SelectTrigger className="h-11 rounded-xl bg-card border-border text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODELOS_ETIQUETAS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.nome} <span className="text-muted-foreground ml-1">({m.descricao})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Colunas por Linha Padrão */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Colunas por Linha (Carreira do Rolo)</Label>
                <span className="text-[11px] text-muted-foreground">
                  {colunasPadrao} {colunasPadrao === 1 ? 'etiqueta por linha' : 'etiquetas lado a lado'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setColunasPadrao(num)}
                    className={`h-11 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                      colunasPadrao === num
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black ring-2 ring-amber-400/40'
                        : 'bg-secondary/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    {num}x {num > 1 ? 'Col.' : 'Col.'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                * Para rolos de 33x21mm no Brasil, o padrão mais comum é <strong>3 colunas</strong> na mesma carreira.
              </p>
            </div>

            {/* 4. Layout Padrão: Completa vs Simples */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Tipo de Layout Padrão</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLayoutPadrao('completa')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                    layoutPadrao === 'completa'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black ring-2 ring-amber-400/40'
                      : 'bg-secondary/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Completa (Com Loja e Resp.)
                </button>

                <button
                  type="button"
                  onClick={() => setLayoutPadrao('simples')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 ${
                    layoutPadrao === 'simples'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md font-black ring-2 ring-amber-400/40'
                      : 'bg-secondary/40 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Simples (Limpa / Gôndola)
                </button>
              </div>
            </div>

            {/* Botão de Salvar */}
            <div className="pt-2">
              <Button
                onClick={() => salvarConfigMutation.mutate()}
                disabled={salvarConfigMutation.isPending}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md gap-2"
              >
                <Save className="w-4 h-4" />
                {salvarConfigMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>

        {/* Simulação em Tempo Real + Impressoras Cadastradas */}
        <div className="lg:col-span-6 space-y-6">
          {/* Simulação Visual do Padrão */}
          <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-inner flex flex-col items-center justify-center">
            <div className="flex items-center justify-between w-full mb-3 px-1 text-[10px] font-bold text-zinc-400">
              <span className="uppercase tracking-wider">
                Simulação Padrão da Loja • {modeloInfo.larguraMm}mm x {modeloInfo.alturaMm}mm
              </span>
              <span className="text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 font-mono text-[9px]">
                {colunasPadrao} {colunasPadrao === 1 ? 'Coluna' : 'Colunas'} • {layoutPadrao === 'simples' ? 'Simples' : 'Completa'}
              </span>
            </div>

            <div className="w-full overflow-x-auto py-2 flex justify-center">
              <div className="flex items-stretch gap-2 justify-center mx-auto" style={{ minWidth: 'fit-content' }}>
                {Array.from({ length: colunasPadrao }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`bg-white text-black rounded-md border-2 border-black font-sans select-none shadow-2xl flex flex-col justify-between transition-all ${
                      isMini
                        ? colunasPadrao > 2
                          ? 'w-[130px] min-h-[122px] p-2 text-[9px]'
                          : colunasPadrao === 2
                          ? 'w-[160px] min-h-[130px] p-2.5'
                          : 'w-[220px] min-h-[140px] p-3'
                        : colunasPadrao > 1
                        ? 'w-[200px] min-h-[135px] p-2.5'
                        : 'w-full max-w-[320px] min-h-[145px] p-3'
                    }`}
                  >
                    {!isSimples && (
                      <div className={`flex items-center justify-between border-b-2 border-black ${isMini ? 'pb-0.5 mb-0.5' : 'pb-1 mb-1'}`}>
                        <span className={`${isMini ? (colunasPadrao > 2 ? 'text-[7px]' : 'text-[8.5px]') : 'text-[10px]'} font-black tracking-wider uppercase`}>
                          PRODUÇÃO
                        </span>
                        <span className={`${isMini ? (colunasPadrao > 2 ? 'text-[6.5px]' : 'text-[7.5px]') : 'text-[9px]'} font-bold text-zinc-700`}>
                          FILALAB
                        </span>
                      </div>
                    )}

                    <div className={isMini ? 'my-0.5' : (isSimples ? 'my-1' : 'my-1')}>
                      <h3 className={`${isMini ? (colunasPadrao > 2 ? 'text-[9px]' : 'text-xs') : (isSimples ? 'text-sm font-black' : 'text-xs font-black')} uppercase leading-tight tracking-tight text-black line-clamp-2`}>
                        MUSSARELA FATIADA
                      </h3>
                      <div className={`inline-block bg-black text-white ${isMini ? (colunasPadrao > 2 ? 'text-[6px] px-0.5 py-0' : 'text-[7.5px] px-1 py-0.5') : 'text-[9px] px-1.5 py-0.5'} font-extrabold rounded-sm mt-0.5`}>
                        PESO: 500g
                      </div>
                    </div>

                    <div className={`grid grid-cols-2 gap-1 ${isSimples ? 'border-t-2 border-dashed border-black pt-1 mt-1' : 'border-y border-dashed border-black py-1 my-1'} text-black`}>
                      <div>
                        <span className={`${isMini ? 'text-[5px]' : 'text-[6.5px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                          {isSimples ? 'DATA' : 'PRODUÇÃO'}
                        </span>
                        <span className={`${isMini ? (colunasPadrao > 2 ? 'text-[7px]' : 'text-[8.5px]') : 'text-[10px]'} font-black font-mono block leading-tight`}>
                          {formatarDataBR(new Date().toISOString().split('T')[0])}
                        </span>
                        <span className={`${isMini ? (colunasPadrao > 2 ? 'text-[6px]' : 'text-[7.5px]') : 'text-[8px]'} font-bold font-mono text-zinc-700 block leading-none mt-0.5`}>
                          {getHoraAtualHHMM()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`${isMini ? 'text-[5px]' : 'text-[6.5px]'} font-extrabold uppercase text-zinc-600 block leading-none`}>
                          VALIDADE
                        </span>
                        <span className={`${isMini ? (colunasPadrao > 2 ? 'text-[8px]' : 'text-[9.5px]') : 'text-[11px]'} font-black font-mono text-black block leading-tight`}>
                          {formatarDataBR(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])}
                        </span>
                      </div>
                    </div>

                    {!isSimples && (
                      <div className={`flex items-center justify-between ${isMini ? (colunasPadrao > 2 ? 'text-[5.5px]' : 'text-[6.5px]') : 'text-[7.5px]'} font-extrabold text-black pt-0.5`}>
                        <span className="uppercase tracking-wide">{selectedUnit}</span>
                        <span className={`uppercase truncate ${isMini ? (colunasPadrao > 2 ? 'max-w-[60px]' : 'max-w-[90px]') : 'max-w-[150px]'}`}>
                          RESP: {user?.username || 'OPERADOR'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gerenciamento de Impressoras da Loja */}
          <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                <Printer className="w-4 h-4 text-amber-400" />
                Impressoras Térmicas ({selectedUnit})
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setImpressoraEditando(null);
                  setModalImpressoraOpen(true);
                }}
                className="rounded-xl h-8 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Impressora
              </Button>
            </div>

            <div className="space-y-2">
              {impressoras.map((imp) => (
                <div
                  key={imp.id}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    impressoraPadraoId === imp.id
                      ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                      : 'bg-secondary/30 border-border/60 hover:border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center text-foreground">
                      <Wifi className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{imp.nome}</span>
                        {impressoraPadraoId === imp.id && (
                          <Badge className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0 h-4">
                            PADRÃO
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {imp.modelo} • {imp.ip}:{imp.porta}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setImpressoraEditando(imp);
                        setModalImpressoraOpen(true);
                      }}
                      className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => excluirImpressoraMutation.mutate(imp.id)}
                      className="w-8 h-8 rounded-xl text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {impressoras.length === 0 && (
                <div className="text-center py-6 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                  Nenhuma impressora configurada para esta unidade.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Cadastro / Edição de Impressora */}
      <CadastroImpressoraModal
        open={modalImpressoraOpen}
        onOpenChange={setModalImpressoraOpen}
        impressoraEditando={impressoraEditando}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['etiquetas-impressoras', selectedUnit] });
          setModalImpressoraOpen(false);
        }}
        loading={false}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Save, X } from 'lucide-react';
import {
  EtiquetaProduto,
  CATEGORIAS_PADRAO,
} from '@/lib/api-etiquetas';

interface CadastroProdutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoEditando: EtiquetaProduto | null;
  onSave: (dados: {
    id?: string;
    nome: string;
    categoria: string;
    validade_producao_dias: number;
    validade_descongelamento_dias: number;
    ativo: boolean;
  }) => void;
  loading?: boolean;
}

export function CadastroProdutoModal({
  open,
  onOpenChange,
  produtoEditando,
  onSave,
  loading = false,
}: CadastroProdutoModalProps) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS_PADRAO[0]);
  const [validadeProducao, setValidadeProducao] = useState('5');
  const [validadeDescongelamento, setValidadeDescongelamento] = useState('3');
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (produtoEditando) {
      setNome(produtoEditando.nome);
      setCategoria(produtoEditando.categoria || CATEGORIAS_PADRAO[0]);
      setValidadeProducao(String(produtoEditando.validade_producao_dias || 5));
      setValidadeDescongelamento(String(produtoEditando.validade_descongelamento_dias ?? 1));
      setAtivo(produtoEditando.ativo);
    } else {
      setNome('');
      setCategoria(CATEGORIAS_PADRAO[0]);
      setValidadeProducao('5');
      setValidadeDescongelamento('1');
      setAtivo(true);
    }
  }, [produtoEditando, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    onSave({
      id: produtoEditando?.id,
      nome: nome.trim(),
      categoria,
      validade_producao_dias: Math.max(1, Number(validadeProducao) || 1),
      validade_descongelamento_dias: Math.max(1, Number(validadeDescongelamento) || 1),
      ativo,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/80 rounded-3xl max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-mono tracking-tight text-foreground">
                {produtoEditando ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Cadastre o item e suas regras de validade automática
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Nome do Produto *</Label>
            <Input
              placeholder="Ex: MUSSARELA FATIADA, FRANGO DESFIADO..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 rounded-xl bg-card border-border uppercase font-semibold text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="h-11 rounded-xl bg-card border-border text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_PADRAO.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/30 border border-border/60">
              <Label className="text-[11px] font-bold text-foreground block">
                Validade Produção (Dias)
              </Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={validadeProducao}
                onChange={(e) => setValidadeProducao(e.target.value)}
                className="h-10 rounded-xl bg-card border-border font-mono font-bold text-center text-sm"
                required
              />
              <span className="text-[10px] text-muted-foreground block text-center">
                Soma automática ao produzir
              </span>
            </div>

            <div className="space-y-1.5 p-3 rounded-2xl bg-secondary/30 border border-border/60">
              <Label className="text-[11px] font-bold text-foreground block">
                Validade Descongelar (Dias)
              </Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={validadeDescongelamento}
                onChange={(e) => setValidadeDescongelamento(e.target.value)}
                className="h-10 rounded-xl bg-card border-border font-mono font-bold text-center text-sm"
                required
              />
              <span className="text-[10px] text-muted-foreground block text-center">
                Soma ao descongelar
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
            <div>
              <Label className="text-xs font-bold text-foreground block">Produto Ativo</Label>
              <span className="text-[10px] text-muted-foreground">
                Exibir na lista de seleção rápida de etiquetas
              </span>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-11 px-4 border-border text-xs font-semibold"
            >
              <X className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !nome.trim()}
              className="rounded-xl h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md gap-2"
            >
              {produtoEditando ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Salvando...' : produtoEditando ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

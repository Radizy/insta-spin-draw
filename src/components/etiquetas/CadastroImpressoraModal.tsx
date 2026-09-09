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
import { Printer, Plus, Save, X, Wifi } from 'lucide-react';
import { EtiquetaImpressora } from '@/lib/api-etiquetas';

interface CadastroImpressoraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  impressoraEditando: EtiquetaImpressora | null;
  onSave: (dados: {
    id?: string;
    nome: string;
    modelo: string;
    ip: string;
    porta: number;
    ativa: boolean;
  }) => void;
  loading?: boolean;
}

const MODELOS_SUPORTADOS = [
  'Elgin L42 Pro Full',
  'Elgin L42 Pro',
  'Zebra ZD220 / GC420t',
  'Zebra ZD420 / ZT230',
  'Térmica Padrão ESC/POS (80mm)',
  'Impressora de Rede Genérica (RAW 9100)',
];

export function CadastroImpressoraModal({
  open,
  onOpenChange,
  impressoraEditando,
  onSave,
  loading = false,
}: CadastroImpressoraModalProps) {
  const [nome, setNome] = useState('');
  const [modelo, setModelo] = useState(MODELOS_SUPORTADOS[0]);
  const [ip, setIp] = useState('192.168.0.120');
  const [porta, setPorta] = useState('9100');
  const [ativa, setAtiva] = useState(true);

  useEffect(() => {
    if (impressoraEditando) {
      setNome(impressoraEditando.nome);
      setModelo(impressoraEditando.modelo || MODELOS_SUPORTADOS[0]);
      setIp(impressoraEditando.ip || '');
      setPorta(String(impressoraEditando.porta || 9100));
      setAtiva(impressoraEditando.ativa);
    } else {
      setNome('');
      setModelo(MODELOS_SUPORTADOS[0]);
      setIp('192.168.0.120');
      setPorta('9100');
      setAtiva(true);
    }
  }, [impressoraEditando, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !ip.trim()) return;

    onSave({
      id: impressoraEditando?.id,
      nome: nome.trim(),
      modelo,
      ip: ip.trim(),
      porta: Number(porta) || 9100,
      ativa,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/80 rounded-3xl max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-mono tracking-tight text-foreground">
                {impressoraEditando ? 'Editar Impressora' : 'Nova Impressora'}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Configure a impressora térmica de rede (Elgin, Zebra ou Genérica)
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Nome Identificador *</Label>
            <Input
              placeholder="Ex: Elgin Produção Cozinha, Balcão 01..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-11 rounded-xl bg-card border-border font-semibold text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Modelo</Label>
            <Select value={modelo} onValueChange={setModelo}>
              <SelectTrigger className="h-11 rounded-xl bg-card border-border text-xs font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELOS_SUPORTADOS.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-bold text-foreground">IP na Rede Local *</Label>
              <Input
                placeholder="192.168.0.120"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="h-11 rounded-xl bg-card border-border font-mono font-semibold text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Porta</Label>
              <Input
                placeholder="9100"
                value={porta}
                onChange={(e) => setPorta(e.target.value)}
                className="h-11 rounded-xl bg-card border-border font-mono font-bold text-center text-sm"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/40 border border-border/60">
            <div>
              <Label className="text-xs font-bold text-foreground block">Impressora Ativa</Label>
              <span className="text-[10px] text-muted-foreground">
                Disponível para seleção nas abas de Produção e Descongelamento
              </span>
            </div>
            <Switch checked={ativa} onCheckedChange={setAtiva} />
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
              disabled={loading || !nome.trim() || !ip.trim()}
              className="rounded-xl h-11 px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md gap-2"
            >
              {impressoraEditando ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Salvando...' : impressoraEditando ? 'Salvar Alterações' : 'Cadastrar Impressora'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

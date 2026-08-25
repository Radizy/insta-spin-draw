import { useState, useEffect } from 'react';
import { FuncionarioInterno } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Briefcase, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CadastroFuncionarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarioToEdit?: FuncionarioInterno | null;
  onSave: (data: { nome: string; cargo: string; id?: string }) => Promise<void>;
}

const CARGOS_SUGERIDOS = [
  'Pizzaiolo',
  'Forneiro',
  'Ajudante de Cozinha',
  'Atendente de Balcão',
  'Operador de Caixa',
  'Gerente de Loja',
  'Auxiliar de Limpeza',
  'Estoquista'
];

export function CadastroFuncionarioModal({
  open,
  onOpenChange,
  funcionarioToEdit,
  onSave,
}: CadastroFuncionarioModalProps) {
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (funcionarioToEdit) {
      setNome(funcionarioToEdit.nome || '');
      setCargo(funcionarioToEdit.cargo || '');
    } else {
      setNome('');
      setCargo('');
    }
  }, [funcionarioToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error('Informe o nome do funcionário');
      return;
    }
    if (!cargo.trim()) {
      toast.error('Informe o cargo ou selecione uma opção sugerida');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        nome: nome.trim(),
        cargo: cargo.trim(),
        id: funcionarioToEdit?.id,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar funcionário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-mono">
            <User className="w-5 h-5 text-amber-500" />
            {funcionarioToEdit ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Equipe interna da loja (cozinha, salão e atendimento). Isolado dos motoboys.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="nome" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Nome Completo
            </Label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="nome"
                placeholder="Ex: Carlos Oliveira"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="pl-9 bg-background/50 border-border"
                autoFocus
              />
            </div>
          </div>

          {/* Cargo */}
          <div className="space-y-1.5">
            <Label htmlFor="cargo" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Cargo / Função
            </Label>
            <div className="relative">
              <Briefcase className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cargo"
                placeholder="Ex: Pizzaiolo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="pl-9 bg-background/50 border-border"
              />
            </div>

            {/* Sugestões de Cargo */}
            <div className="pt-2">
              <span className="text-[11px] text-muted-foreground font-medium block mb-1.5">
                Cargos mais comuns:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {CARGOS_SUGERIDOS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCargo(item)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      cargo === item
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-secondary/60 text-muted-foreground border-border/60 hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/50 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-border"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2"
            >
              {loading ? (
                'Salvando...'
              ) : funcionarioToEdit ? (
                <>
                  <Check className="w-4 h-4" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

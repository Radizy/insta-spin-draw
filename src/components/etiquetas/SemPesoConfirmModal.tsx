import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Scale, Printer, X } from 'lucide-react';

interface SemPesoConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function SemPesoConfirmModal({
  open,
  onOpenChange,
  onConfirm,
}: SemPesoConfirmModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/80 rounded-3xl max-w-md p-6 shadow-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Scale className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-foreground text-center font-mono">
            Você não informou o peso
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground mt-1">
            Deseja continuar e prosseguir para a impressão mesmo sem especificar o peso do produto?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-11 px-5 border-border hover:bg-secondary text-xs font-semibold gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            className="rounded-xl h-11 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
            Imprimir sem peso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

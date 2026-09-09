import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Scale, AlertTriangle } from 'lucide-react';

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border/80 rounded-3xl max-w-md p-6">
        <AlertDialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Scale className="w-6 h-6" />
          </div>
          <AlertDialogTitle className="text-xl font-extrabold text-foreground text-center font-mono">
            Você não informou o peso.
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm text-muted-foreground mt-1">
            Deseja continuar e prosseguir para a impressão mesmo sem especificar o peso do produto?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4 sm:justify-center">
          <AlertDialogCancel className="rounded-xl h-11 px-5 border-border hover:bg-secondary text-xs font-semibold">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-xl h-11 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md"
          >
            Imprimir sem peso
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

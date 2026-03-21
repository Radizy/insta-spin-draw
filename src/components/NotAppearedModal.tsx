import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { Entregador } from '@/lib/api';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface NotAppearedModalProps {
  open: boolean;
  entregador: Entregador | null;
  onClose: () => void;
  onNotAppeared: () => void;
  selectedUnit: string;
  autoCloseMs?: number;
}

export function NotAppearedModal({
  open,
  entregador,
  onClose,
  onNotAppeared,
  selectedUnit,
  autoCloseMs = 10000,
}: NotAppearedModalProps) {
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseMs / 1000));
  const [confirmed, setConfirmed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    if (!entregador || !selectedUnit) return;
    setCountdown(10);
    setRetryCount(prev => prev + 1);

    const channel = supabase.channel(`tv-calls-broadcast-${selectedUnit}`);
    channel.send({
      type: 'broadcast',
      event: 'tv-call-retry',
      payload: { entregadorId: entregador.id }
    });
    toast.info(`Tentativa ${retryCount + 1}: Re-enviando para a TV...`);
  };

  useEffect(() => {
    if (countdown === 0 && !confirmed && retryCount < 2 && open) {
      handleRetry();
    }
  }, [countdown, confirmed, retryCount, open]);

  useEffect(() => {
    if (!open || !entregador || !selectedUnit) {
      setCountdown(Math.ceil(autoCloseMs / 1000));
      setConfirmed(false);
      return;
    }

    const channel = supabase
      .channel(`tv-calls-broadcast-${selectedUnit}`)
      .on('broadcast', { event: 'tv-call-started' }, (payload) => {
        if (payload.payload.entregadorId === entregador.id) {
          setConfirmed(true);
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      })
      .subscribe();

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);

    // Strict auto-close
    const autoCloseTimer = setTimeout(() => {
      if (!confirmed) onClose();
    }, autoCloseMs);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(autoCloseTimer);
      supabase.removeChannel(channel);
      if (!open) setRetryCount(0);
    };
  }, [open, autoCloseMs, onClose, entregador, selectedUnit, confirmed]);

  if (!open || !entregador) return null;

  return (
    <div className={cn(
      "fixed bottom-40 right-6 z-[100] w-80 p-4 rounded-2xl shadow-2xl transition-all duration-500 animate-in slide-in-from-right-10",
      confirmed 
        ? "bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md" 
        : "bg-slate-900/90 border border-slate-700/50 backdrop-blur-md"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
            confirmed ? "bg-emerald-500 text-white" : "bg-amber-500 text-white animate-pulse"
          )}>
            {confirmed ? <CheckCircle2 className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-100 leading-tight">{entregador.nome}</h4>
            <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              {confirmed ? "Confirmado na TV" : "Aguardando TV..."}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {!confirmed && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Sincronizando...</span>
            <span>{countdown}s</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              size="sm" 
              className="text-[10px] h-8 border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            >
              <Loader2 className="w-3 h-3 mr-1" /> RE-CHAMAR
            </Button>
            <Button 
              onClick={onNotAppeared} 
              variant="destructive" 
              size="sm" 
              className="text-[10px] h-8 font-bold"
            >
              <AlertTriangle className="w-3 h-3 mr-1" /> NÃO VEIO
            </Button>
          </div>
        </div>
      )}

      {confirmed && (
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold animate-in fade-in zoom-in">
          <CheckCircle2 className="w-4 h-4" /> Chamada iniciada com sucesso!
        </div>
      )}
    </div>
  );
}


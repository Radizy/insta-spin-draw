import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, AlertTriangle, CheckCircle2, Loader2, Volume2 } from 'lucide-react';
import { Entregador } from '@/lib/api';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useTTS } from '@/hooks/useTTS';

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
  autoCloseMs = 10000, // Aumentado para 10 segundos conforme solicitado
}: NotAppearedModalProps) {
  const [countdown, setCountdown] = useState(Math.ceil(autoCloseMs / 1000));
  const [confirmed, setConfirmed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { speak } = useTTS();

  const handleRetry = async () => {
    if (!entregador || !selectedUnit) return;

    // Reinicia o contador para dar mais 10 segundos de chance
    setCountdown(10);
    setRetryCount(prev => prev + 1);

    // Dispara um sinal de re-tentativa usando o canal ativo
    if (isListening) {
      console.log(`[Roteirista] Enviando sinal tv-call-retry (${retryCount + 1}) para ${entregador.nome}`);
      const channel = supabase.channel(`tv-calls-broadcast-${selectedUnit}`);
      channel.send({
        type: 'broadcast',
        event: 'tv-call-retry',
        payload: { entregadorId: entregador.id }
      });
      toast.info(`Tentativa ${retryCount + 1}: Re-enviando chamada para a TV...`);
    } else {
      toast.error('Aguardando conexão com a TV...');
    }
  };

  // Automação: Tenta chamar novamente quando o contador chega a zero
  useEffect(() => {
    if (countdown === 0 && !confirmed && retryCount < 2 && open && isListening) {
      console.log(`[Roteirista] Automação: Tentativa ${retryCount + 1} iniciada (após 10s)`);
      handleRetry();
    } else if (countdown === 0 && !confirmed && retryCount >= 2 && open) {
      console.warn('[Roteirista] Todas as tentativas falharam após 30s totais. Chamando na voz...');
      speak('Chamar na voz, erro reportado ao desenvolvedor do sistema', {
        enabled: true,
        volume: 100,
        voice_model: 'browser_clara'
      });
    }
  }, [countdown, confirmed, retryCount, open, isListening, speak]);

  useEffect(() => {
    if (!open || !entregador || !selectedUnit) {
      setCountdown(Math.ceil(autoCloseMs / 1000));
      setConfirmed(false);
      return;
    }

    // Iniciar escuta do sinal da TV
    const channel = supabase
      .channel(`tv-calls-broadcast-${selectedUnit}`)
      .on('broadcast', { event: 'tv-call-started' }, (payload) => {
        console.log('[Roteirista] Sinal tv-call-started recebido:', payload);
        if (payload.payload.entregadorId === entregador.id) {
          setConfirmed(true);
          // Fecha o modal 2 segundos após a confirmação visual
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsListening(true);
        }
      });

    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
      supabase.removeChannel(channel);
      if (!open) setRetryCount(0); // Reseta para a próxima vez
    };
  }, [open, autoCloseMs, onClose, entregador, selectedUnit, confirmed]);

  if (!entregador) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center border-none bg-slate-900/95 backdrop-blur-xl shadow-2xl">
        <div className="py-8 px-2">
          <div className={cn(
            "w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center transition-all duration-500",
            confirmed
              ? "bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-110"
              : "bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] glow-pulse"
          )}>
            {confirmed ? (
              <CheckCircle2 className="w-12 h-12 text-white animate-in zoom-in duration-300" />
            ) : (
              <User className="w-12 h-12 text-white" />
            )}
          </div>

          <p className="text-slate-400 font-bold tracking-widest text-xs mb-2">
            {confirmed ? "CONFIRMADO NA TV" : "AGUARDANDO TV..."}
          </p>

          <h2 className={cn(
            "text-4xl font-black font-mono mb-8 transition-colors duration-500",
            confirmed ? "text-emerald-400" : "text-amber-400"
          )}>
            {entregador.nome.toUpperCase()}
          </h2>

          {!confirmed && (
            <div className="flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {retryCount >= 2 && countdown === 0 ? (
                <div className="w-full p-4 bg-red-500/10 border border-red-500/50 rounded-xl mb-2 animate-pulse">
                  <div className="flex items-center justify-center gap-2 text-red-400 font-bold mb-1">
                    <AlertTriangle className="w-5 h-5" />
                    FALHA NA COMUNICAÇÃO
                  </div>
                  <p className="text-xs text-red-400/80 leading-tight">
                    A TV não respondeu às tentativas automáticas.<br />
                    Chamada por voz acionada.
                  </p>
                </div>
              ) : countdown === 0 ? (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="lg"
                  className="gap-3 text-sm px-6 h-14 font-bold border-amber-500 text-amber-500 hover:bg-amber-500/10 shadow-xl transition-all w-full leading-tight"
                >
                  <Loader2 className="w-5 h-5" />
                  NÃO CHAMOU NA TV? <br /> CLIQUE AQUI (TENTAR NOVAMENTE)
                </Button>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                    {isListening ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        {retryCount > 0 ? `Tentativa ${retryCount}/2...` : "Sincronizando com a TV..."}
                      </>
                    ) : (
                      "Conectando..."
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-mono">
                    {retryCount >= 2 ? "Finalizando em..." : "Próxima tentativa em..."} {countdown}s
                  </p>
                </div>
              )}

              <Button
                onClick={onNotAppeared}
                variant="destructive"
                size="lg"
                className="gap-3 text-lg px-10 h-14 font-black shadow-xl hover:scale-105 active:scale-95 transition-all w-full mt-2"
              >
                <AlertTriangle className="w-6 h-6" />
                NÃO APARECEU?
              </Button>
            </div>
          )}

          {confirmed && (
            <div className="py-2 animate-in fade-in zoom-in duration-500">
              <p className="text-emerald-400 font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Chamada Iniciada com Sucesso!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

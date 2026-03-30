import { useState, useEffect } from 'react';
import { User, Package, CheckCircle2, Zap } from 'lucide-react';

export function LandingMockup() {
  const [showCall, setShowCall] = useState(false);

  useEffect(() => {
    // Alterna a chamada da TV a cada 4 segundos
    const interval = setInterval(() => {
      setShowCall((prev) => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-xl mx-auto transform hover:-translate-y-2 transition-transform duration-500">
      {/* Moldura do Tablet/Tela */}
      <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-xl shadow-2xl overflow-hidden shadow-primary/20 aspect-video relative flex flex-col">
        {/* Header do Mockup */}
        <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black/40">
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-mono font-bold text-sm tracking-tight text-white/90">FilaLab Live Preview</span>
          </div>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
        </div>

        {/* Corpo do Mockup (Simulando Roteirista) */}
        <div className="flex-1 flex p-4 gap-4 bg-background/60">
          <div className="flex-1 space-y-3 opacity-90">
            <h3 className="text-[10px] md:text-xs font-semibold text-white/60 flex items-center gap-2 uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-status-available"></div> Fila de Disponíveis
            </h3>
            <div className="space-y-2">
              {[
                { name: 'Lucas S.', type: 'Normal' },
                { name: 'Pedro K.', type: 'Metro' },
                { name: 'Rafael', type: 'Normal' }
              ].map((m, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-2 flex items-center gap-2 hover:bg-white/10 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center text-[10px] font-bold">{i+1}</div>
                  <div className="flex-1">
                    <p className="text-xs md:text-sm font-medium">{m.name}</p>
                    <p className="text-[9px] md:text-[10px] text-white/40">{m.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex-1 space-y-3 opacity-50 block md:block">
            <h3 className="text-[10px] md:text-xs font-semibold text-white/60 flex items-center gap-2 uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-status-delivering"></div> Em Entrega
            </h3>
            <div className="space-y-2">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-status-delivering/20 flex items-center justify-center text-status-delivering">
                  <User className="w-3 h-3" />
                </div>
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-medium">Marcos</p>
                  <p className="text-[9px] md:text-[10px] text-status-delivering/60">Há 12 min</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Simulação do Modal de TV (Chamada) */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center transition-all duration-500 overflow-hidden ${showCall ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className={`absolute w-[150%] h-[150%] bg-gradient-to-tr from-primary/40 to-emerald-500/40 opacity-30 animate-spin-slow`} style={{ animationDuration: '6s' }} />
          
          <div className={`relative z-10 p-5 md:p-8 w-[80%] rounded-2xl bg-gradient-to-br from-primary to-emerald-600 border border-white/20 shadow-2xl flex flex-col items-center gap-2 text-center transform transition-transform duration-700 ease-out ${showCall ? 'translate-y-0 scale-100' : 'translate-y-16 scale-75 blur-sm'}`}>
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/20 flex items-center justify-center animate-pulse mb-1">
              <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-white drop-shadow-md" />
            </div>
            <div>
              <p className="text-emerald-100 text-[10px] md:text-xs font-medium uppercase tracking-[0.2em] mb-1 drop-shadow-sm">Se apresente!</p>
              <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-md">PEDRO K.</h2>
            </div>
            <div className="mt-2 px-3 md:px-5 py-1.5 md:py-2 rounded-full bg-black/40 backdrop-blur-md flex items-center gap-2 border border-white/10 shadow-inner">
               <Package className="w-3 h-3 md:w-4 md:h-4 text-emerald-300" />
               <span className="text-[10px] md:text-xs font-semibold text-emerald-50">Pegue a Bag Metro</span>
            </div>
          </div>
        </div>

      </div>
      
      {/* Sombras Decorativas Externa */}
      <div className="absolute -bottom-6 -z-10 left-10 right-10 h-10 bg-primary/20 blur-2xl rounded-full"></div>
    </div>
  );
}

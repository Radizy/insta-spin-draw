import { Clock, User, Bike, Zap, Package } from 'lucide-react';
import { Entregador } from '@/lib/api';

interface QueueSidebarWidgetProps {
    availableQueue: Entregador[];
    deliveringQueue: Entregador[];
    lastCalled: Entregador | null;
}

export function QueueSidebarWidget({ availableQueue = [], deliveringQueue = [], lastCalled }: QueueSidebarWidgetProps) {
    const nextInQueue = availableQueue[0];

    return (
        <div className="w-[340px] h-full flex-shrink-0 flex flex-col gap-4 px-6 py-10 z-10 overflow-hidden bg-slate-950/50 backdrop-blur-sm border-l border-white/8 relative">
            {/* Background Decorativo Especifico para a Sidebar */}
            <div className="absolute top-[10%] right-[-10%] w-[60%] h-[40%] bg-emerald-500/5 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[30%] bg-amber-500/5 blur-[80px] rounded-full mix-blend-screen pointer-events-none" />

            {/* ---- PRÓXIMO DA FILA ---- */}
            <div className="relative z-10">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Próximo a Ser Chamado
                </p>
                {nextInQueue ? (
                    <div className="bg-primary/10 border border-primary/30 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-lg animate-slide-in-right">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xl font-black text-primary font-mono">1</span>
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl font-bold text-white truncate">{nextInQueue.nome}</p>
                            <p className="text-xs text-primary/80 font-mono mt-0.5">Na fila · aguardando</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-slate-500 text-sm font-medium">
                        Fila vazia
                    </div>
                )}
            </div>

            {/* ---- FILA DISPONÍVEL (demais) ---- */}
            {availableQueue.length > 1 && (
                <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" />
                        Fila de Espera ({availableQueue.length - 1})
                    </p>
                    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[250px] pr-1 custom-scrollbar">
                        {availableQueue.slice(1).map((e, i) => (
                            <div key={e.id} className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 shrink-0">
                                <span className="text-sm font-bold text-slate-400 font-mono w-5 text-center">{i + 2}</span>
                                <span className="text-sm font-semibold text-slate-200 truncate">{e.nome}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ---- EM ENTREGA / PISTA ---- */}
            {deliveringQueue.length > 0 && (
                <div className="relative z-10">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Bike className="w-3.5 h-3.5" />
                        Em Pista ({deliveringQueue.length})
                    </p>
                    <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[250px] pr-1 custom-scrollbar">
                        {deliveringQueue.map((e, i) => (
                            <div key={e.id} className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                                <span className="text-sm font-semibold text-emerald-200 truncate">{e.nome}</span>
                                {e.tipo_bag && (
                                    <Package className="w-3.5 h-3.5 text-emerald-500/70 flex-shrink-0 ml-auto" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ---- ÚLTIMO CHAMADO ---- */}
            {lastCalled && (
                <div className="mt-auto relative z-10">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Último Chamado
                    </p>
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-lg">
                        <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
                        <div className="min-w-0">
                            <p className="text-lg font-bold text-amber-200 truncate">{lastCalled.nome}</p>
                            <p className="text-xs text-amber-500/80 font-mono">Chamado recentemente</p>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(60px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Stylized Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.02);
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
        }
      `}} />
        </div>
    );
}

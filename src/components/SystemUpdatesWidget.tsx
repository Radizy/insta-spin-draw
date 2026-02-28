import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Bell,
    X,
    Send,
    ArrowDownCircle,
    CalendarClock,
    Sparkles,
    Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { fetchSystemUpdates, SystemUpdate } from '@/lib/api';

export function SystemUpdatesWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestion, setSuggestion] = useState('');

    const { data: updates = [] } = useQuery({
        queryKey: ['system_updates'],
        queryFn: fetchSystemUpdates,
        refetchInterval: 300000, // 5 min
    });

    const releasedUpdates = updates
        .filter(u => u.status === 'lancado')
        .sort((a, b) => {
            const dateA = new Date(a.data_publicacao).getTime();
            const dateB = new Date(b.data_publicacao).getTime();
            return dateB - dateA;
        });

    const plannedUpdates = updates
        .filter(u => u.status === 'planejado')
        .sort((a, b) => {
            const dateA = new Date(a.data_publicacao).getTime();
            const dateB = new Date(b.data_publicacao).getTime();
            return dateB - dateA;
        });

    const handleSendSuggestion = () => {
        if (!suggestion.trim()) return;

        const whatsappNumber = "5511954545985";
        const text = `*Sugestão de Melhoria - FilaLab*\n\n${suggestion}`;
        const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
        setSuggestion('');
        setIsOpen(false);
    };

    const renderBadge = (tipo: string) => {
        const isNew = tipo.toUpperCase() === 'NOVO RECURSO';
        return (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isNew ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                }`}>
                {tipo}
            </span>
        );
    };

    const renderDate = (dateString: string) => {
        if (!dateString) return '';
        try {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                return format(dt, "dd MMM. yyyy", { locale: ptBR });
            }
            return format(new Date(dateString), "dd MMM. yyyy", { locale: ptBR });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    className="fixed bottom-[104px] right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl flex items-center justify-center z-50 transition-all hover:scale-110 group"
                    title="Atualizações do Sistema"
                >
                    <Bell className="w-6 h-6 animate-[wiggle_1s_ease-in-out_infinite]" />

                    <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg flex items-center gap-2 border border-slate-700">
                        Novidades <Zap className="w-4 h-4 text-amber-400" />
                        <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-t border-r border-slate-700"></div>
                    </div>
                </button>
            </DialogTrigger>

            <DialogContent className="max-w-[95vw] md:max-w-6xl h-[85vh] p-0 gap-0 bg-[#1e2230] border-slate-700 overflow-hidden rounded-2xl flex flex-col">
                <DialogHeader className="p-6 border-b border-white/5 bg-slate-900/50 flex-none relative">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-white">
                        <Sparkles className="w-6 h-6 text-indigo-400" /> FilaLab Changelog
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    <div className="flex flex-col md:flex-row h-full">

                        {/* Col 1: Últimas Atualizações */}
                        <div className="flex-1 flex flex-col h-full border-r border-white/5 bg-[#171a23]">
                            <div className="p-4 bg-indigo-500/10 border-b border-indigo-500/20 sticky top-0 z-10">
                                <h3 className="text-sm uppercase tracking-wider font-bold text-indigo-400 flex items-center gap-2">
                                    <ArrowDownCircle className="w-4 h-4" /> Últimas Atualizações
                                </h3>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                                {releasedUpdates.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-8">Nenhuma atualização recente.</p>
                                )}
                                {releasedUpdates.map((update) => (
                                    <div key={update.id} className="bg-slate-800/40 border border-white/5 p-4 rounded-xl hover:bg-slate-800/60 transition-colors">
                                        <h4 className="font-bold text-slate-200 text-lg mb-3 leading-tight">{update.titulo}</h4>
                                        <div className="flex items-center justify-between mt-auto">
                                            {renderBadge(update.tipo)}
                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                                <CalendarClock className="w-3.5 h-3.5" />
                                                {renderDate(update.data_publicacao)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 2: Futuras Atualizações */}
                        <div className="flex-1 flex flex-col h-full border-r border-white/5 bg-[#13161d]">
                            <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 sticky top-0 z-10">
                                <h3 className="text-sm uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> Futuras Atualizações
                                </h3>
                            </div>
                            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                                {plannedUpdates.length === 0 && (
                                    <p className="text-slate-500 text-sm text-center py-8">Novidades em breve.</p>
                                )}
                                {plannedUpdates.map((update) => (
                                    <div key={update.id} className="bg-emerald-900/10 border border-emerald-500/10 p-4 rounded-xl hover:bg-emerald-900/20 transition-colors">
                                        <h4 className="font-bold text-slate-200 text-lg mb-3 leading-tight">{update.titulo}</h4>
                                        <div className="flex items-center justify-between mt-auto">
                                            {renderBadge(update.tipo)}
                                            <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                                <CalendarClock className="w-3.5 h-3.5" />
                                                {renderDate(update.data_publicacao)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Col 3: Envie sua sugestão */}
                        <div className="flex-[0.8] flex flex-col h-full bg-[#1b1f2b]">
                            <div className="p-4 border-b border-white/5 sticky top-0 z-10">
                                <h3 className="text-sm uppercase tracking-wider font-bold text-slate-300">
                                    Envie sua sugestão para nós
                                </h3>
                            </div>
                            <div className="flex-1 p-6 flex flex-col">
                                <Textarea
                                    value={suggestion}
                                    onChange={(e) => setSuggestion(e.target.value)}
                                    placeholder="Gostaria que vocês adicionassem..."
                                    className="flex-1 resize-none bg-slate-900/50 border-slate-700 text-slate-200 placeholder:text-slate-600 focus-visible:ring-indigo-500 p-4 rounded-xl text-base leading-relaxed"
                                />
                                <Button
                                    onClick={handleSendSuggestion}
                                    disabled={!suggestion.trim()}
                                    className="mt-4 w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    Enviar <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0,0,0,0.1);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.2);
          }
          @keyframes wiggle {
            0%, 100% { transform: rotate(-3deg); }
            50% { transform: rotate(3deg); }
          }
        `}} />
            </DialogContent>
        </Dialog>
    );
}

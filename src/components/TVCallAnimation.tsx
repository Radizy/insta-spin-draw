import { useQuery } from '@tanstack/react-query';
import { fetchGlobalConfig } from '@/lib/api';

interface TVCallAnimationProps {
  show: boolean;
  tipo: 'ENTREGA' | 'PAGAMENTO';
  nomeMotoboy: string;
  bagNome?: string;
  callPhrase?: string;
  bagPhrase?: string;
  bebidaPhrase?: string;
  hasBebida?: boolean;
  onComplete: () => void;
}

export const TVCallAnimation = ({
  show,
  tipo,
  nomeMotoboy,
  bagNome,
  callPhrase,
  bagPhrase,
  bebidaPhrase,
  hasBebida,
  onComplete,
}: TVCallAnimationProps) => {
  // Timer removido: o componente pai (TV.tsx) controla a duração da exibição
  // Entrega = 15s, Pagamento = 4s — cada um gerenciado pelo pai via onComplete

  // Buscar títulos personalizados da configuração
  const { data: entregaTituloCustom } = useQuery({
    queryKey: ['global-config', 'tv_entrega_titulo'],
    queryFn: () => fetchGlobalConfig('tv_entrega_titulo'),
  });

  const { data: pagamentoTituloCustom } = useQuery({
    queryKey: ['global-config', 'tv_pagamento_titulo'],
    queryFn: () => fetchGlobalConfig('tv_pagamento_titulo'),
  });

  const isEntrega = tipo === 'ENTREGA';
  const isPagamento = tipo === 'PAGAMENTO';
  const bgColor = isPagamento
    ? 'from-emerald-900 via-emerald-800 to-emerald-950'
    : 'from-sky-900 via-sky-800 to-sky-950';
  const accentColor = isPagamento ? 'text-emerald-300' : 'text-sky-300';
  const iconBg = isPagamento ? 'bg-emerald-500' : 'bg-sky-500';

  // Usar títulos personalizados ou fallback padrão
  const tituloExibicao = isPagamento
    ? (pagamentoTituloCustom || 'PAGAMENTO CHAMADO')
    : (entregaTituloCustom || 'ENTREGA CHAMADA');

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center animate-fade-in pointer-events-none bg-black/40 backdrop-blur-md">
      {/* Container Principal */}
      <div className="relative flex flex-col items-center animate-slide-in-elastic">

        {/* Ícone Solto Flutuando */}
        <div className="flex flex-col items-center mb-[-40px] z-10 animate-floating-idle" style={{ animationDelay: '0.1s' }}>
          <div className={`${iconBg} w-32 h-32 md:w-40 md:h-40 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/10`}>
            {isEntrega ? (
              <svg className="w-16 h-16 md:w-20 md:h-20 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            ) : (
              <svg className="w-16 h-16 md:w-20 md:h-20 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Placa Suspensa GIGANTE COM GLASSMORPHISM */}
        <div className={`relative px-8 py-14 md:px-16 md:py-20 rounded-[3rem] md:rounded-[4rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center text-center overflow-hidden min-w-[340px] max-w-[90vw] md:max-w-4xl border-[2px] backdrop-blur-xl ${isPagamento ? 'bg-gradient-to-br from-emerald-900/95 via-emerald-800/90 to-emerald-950/95 border-emerald-400/20' : 'bg-gradient-to-br from-sky-900/95 via-sky-800/90 to-sky-950/95 border-sky-400/20'}`}>

          <div className="absolute inset-0 bg-white/5 pointer-events-none" />

          {/* Destaques de luz sutis */}
          <div className={`absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none ${isPagamento ? 'bg-emerald-300' : 'bg-sky-300'}`} />
          <div className={`absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none ${isPagamento ? 'bg-emerald-500' : 'bg-sky-500'}`} />

          <h1 className={`text-[6vw] md:text-[4vw] leading-none font-black ${isPagamento ? 'text-emerald-300' : 'text-sky-300'} mb-8 tracking-wider uppercase drop-shadow-md z-10 animate-fade-up`} style={{ animationDelay: '0.2s' }}>
            {tituloExibicao}
          </h1>

          <div className="space-y-6 md:space-y-8 flex flex-col items-center w-full z-10">
            <p className="text-[1.8rem] md:text-[2.2rem] text-white/95 font-medium whitespace-pre-line leading-snug drop-shadow-md animate-fade-up" style={{ animationDelay: '0.3s' }}>
              {callPhrase
                || (tipo === 'PAGAMENTO'
                  ? `Senha ${nomeMotoboy}\n${nomeMotoboy}, é a sua vez de receber!\nVá até o caixa imediatamente.`
                  : `Acelera aí, "${nomeMotoboy}"!`)}
            </p>

            {isEntrega && (bagPhrase || bagNome) && (
              <p className="text-[1.6rem] md:text-[2rem] text-white font-bold bg-black/30 px-8 py-4 rounded-full inline-block mt-4 border border-white/10 shadow-inner animate-fade-up" style={{ animationDelay: '0.4s' }}>
                {bagPhrase || `📦 Leve a "${bagNome}"`}
              </p>
            )}

            {isEntrega && hasBebida && (
              <div className="relative overflow-hidden inline-flex items-center justify-center px-8 py-4 rounded-[2rem] bg-yellow-500/10 border border-yellow-400/30 mt-6 shadow-lg animate-fade-up" style={{ animationDelay: '0.5s' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-shimmer" />
                <span className="text-[2.5rem] drop-shadow-md mr-3 z-10">🥤</span>
                <span className="text-[1.5rem] md:text-[1.8rem] text-yellow-100 font-extrabold uppercase tracking-widest drop-shadow-md z-10">
                  {bebidaPhrase || "Tem bebida na entrega"}
                </span>
              </div>
            )}

            <div className="w-full flex justify-center mt-8 animate-fade-up" style={{ animationDelay: '0.6s' }}>
              <p className="text-[8vw] md:text-[6.5vw] font-black text-white tracking-tight break-words drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)]">
                {nomeMotoboy}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes slide-in-elastic {
          0% { transform: translateY(150px) scale(0.95); opacity: 0; }
          60% { transform: translateY(-10px) scale(1.01); opacity: 1; filter: blur(0px); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes floating-idle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }

        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .animate-slide-in-elastic { animation: slide-in-elastic 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .animate-floating-idle { animation: floating-idle 4s ease-in-out infinite; }
        .animate-fade-up { animation: fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
      `}</style>
    </div>
  );
};

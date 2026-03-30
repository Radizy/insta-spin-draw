import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  MessageSquare, 
  Phone, 
  Video, 
  Battery, 
  Wifi,
  FileSpreadsheet,
  Wallet,
  SmartphoneNfc,
  Server,
  MonitorPlay,
  Zap,
  Printer,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';

export function ModuleLiveMockup({ id }: { id: string }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Loop de animação de 4 estágios, com duração de 1.5s cada.
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // WhatsApp Advance Mockup
  if (id === 'whatsapp') {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-4">
        {/* Carcaça iPhone */}
        <div className="w-[260px] h-[400px] sm:h-[450px] bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-800 flex flex-col overflow-hidden shadow-2xl relative">
          {/* Header */}
          <div className="h-16 bg-[#075E54] flex items-center px-4 gap-3 text-white">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center relative">
              <span className="text-xs font-bold">FL</span>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#075E54]"></div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">FilaLab Lojista</h4>
              <p className="text-[10px] text-white/70">Online</p>
            </div>
            <Video className="w-4 h-4 opacity-70" />
            <Phone className="w-4 h-4 opacity-70" />
          </div>

          {/* Chat Body */}
          <div className="flex-1 bg-[#EBE5DE] relative p-3 flex flex-col gap-3 justify-end pb-10" style={{ backgroundImage: 'radial-gradient(circle, #0000000a 1px, transparent 1px)', backgroundSize: '10px 10px' }}>
            {/* Mensagem antiga */}
            <div className="self-end bg-[#DCF8C6] px-3 py-2 rounded-lg rounded-tr-none shadow-sm max-w-[85%] animate-in fade-in zoom-in duration-300">
              <p className="text-xs text-zinc-800">Tô voltando pra loja já!</p>
              <div className="flex justify-end items-center gap-1 mt-1">
                <span className="text-[9px] text-zinc-500">14:22</span>
                <CheckCircle2 className="w-3 h-3 text-blue-500" />
              </div>
            </div>

            {/* Nova Mensagem do Bot (Aparece no step 1 ou 2) */}
            <div className={`self-start bg-white px-3 py-2 rounded-lg rounded-tl-none shadow-sm max-w-[90%] transition-all duration-500 ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <div className="text-[10px] font-bold text-green-600 mb-1">FilaLab Bot</div>
              <p className="text-xs text-zinc-800 leading-relaxed">
                🚀 Oie <b>Carlos</b>!<br/>Sua Rota 15 acabou de ser fechada. Venha pegar a Bag METRO e partir.
              </p>
              <div className="flex justify-end items-center gap-1 mt-1">
                <span className="text-[9px] text-zinc-500">14:25</span>
              </div>
            </div>

            {/* Balão "digitando" que aparece e some (Step 0) */}
            {step === 0 && (
               <div className="self-start bg-white/80 px-4 py-2 rounded-full shadow-sm max-w-[40%] animate-in fade-in duration-300">
                 <div className="flex gap-1 justify-center">
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
               </div>
            )}
          </div>
          
          {/* Footer do WhatsApp */}
          <div className="h-14 bg-[#F0F0F0] absolute bottom-0 w-full flex items-center px-4">
             <div className="flex-1 bg-white h-9 rounded-full px-4 text-xs flex items-center text-zinc-400">Mensagem</div>
          </div>
        </div>
      </div>
    );
  }

  // TV Premium (TTS) Mockup
  if (id === 'tv') {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
         {/* TV Frame */}
         <div className="w-[320px] sm:w-[500px] h-[220px] sm:h-[300px] bg-black rounded-lg border-b-8 border-r-8 border-l-8 border-t-8 border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col">
            {/* Modo Iddle Normal (Tela de Ranking) */}
            <div className={`absolute inset-0 bg-zinc-900 flex p-4 gap-4 transition-opacity duration-700 ${step >= 2 ? 'opacity-30 blur-sm' : 'opacity-100'}`}>
               <div className="w-1/3 bg-zinc-800/50 rounded-lg p-3">
                 <h4 className="text-[10px] sm:text-xs text-white/50 font-bold mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" /> TOP MOTOS</h4>
                 {[1,2,3].map((m) => (
                   <div key={m} className="flex justify-between text-xs sm:text-sm text-white border-b border-white/5 pb-1 mb-2">
                     <span>#{m} Marcos</span>
                     <span className="text-emerald-400">{20 - m}</span>
                   </div>
                 ))}
               </div>
               <div className="flex-1 rounded-lg flex items-center justify-center flex-col p-4">
                 <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-2xl flex items-center justify-center mb-2 animate-pulse">
                    <MonitorPlay className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500/50" />
                 </div>
                 <span className="text-white/30 text-xs sm:text-sm tracking-widest uppercase">FILALAB IDLE</span>
               </div>
            </div>

            {/* Modal de Chamada (Estoura na tela) */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${step >= 2 ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'}`}>
               <div className="w-[85%] h-[80%] bg-gradient-to-br from-blue-600 to-indigo-900 rounded-xl shadow-2xl border-2 border-blue-400/50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                  {/* Animacoes Sonoras */}
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:100%_100%] animate-[slide-in_1s_infinite]"></div>
                  
                  <div className="w-12 h-12 bg-white/20 rounded-full flex gap-1 items-center justify-center mb-2 animate-pulse backdrop-blur-md">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-1.5 bg-white rounded-full animate-bounce" style={{ height: `${(i % 2 === 0 ? 1 : 1.5) * 10}px`, animationDelay: `${i*100}ms` }} />
                    ))}
                  </div>
                  
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wider mb-1 drop-shadow-md">ROBERTO M.</h2>
                  <div className="bg-black/40 text-blue-200 text-xs sm:text-sm font-semibold px-4 py-1.5 rounded-full border border-white/10 shadow-inner">PEGUE A BAG NORMAL</div>
               </div>
            </div>

         </div>
         {/* TV Base Stand */}
         <div className="w-20 sm:w-32 h-2 sm:h-4 bg-zinc-800 translate-y-[-2px] shadow-lg"></div>
         <div className="w-32 sm:w-48 h-2 sm:h-3 bg-zinc-700 rounded-b-lg shadow-xl translate-y-[-2px]"></div>
      </div>
    );
  }

  // Sheets Integrations
  if (id === 'sheets') {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[450px] bg-white rounded-lg shadow-2xl border border-zinc-200 overflow-hidden flex flex-col">
           {/* Sheets Header */}
           <div className="bg-[#F8F9FA] h-14 border-b border-zinc-200 flex items-center px-4 gap-3">
              <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-zinc-700">Fechamentos - Novembro</h4>
                <div className="flex gap-3 text-[10px] text-zinc-500 mt-0.5">
                   <span>Arquivo</span><span>Editar</span><span>Ver</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold">FL</div>
           </div>
           
           {/* Toolbar */}
           <div className="bg-white h-8 border-b border-zinc-200 px-4 flex items-center gap-2">
             <div className="w-4 h-4 rounded bg-zinc-100 italic flex items-center justify-center text-xs font-serif shadow-sm">I</div>
             <div className="w-4 h-4 rounded bg-zinc-100 font-bold flex items-center justify-center text-xs shadow-sm">B</div>
             <div className="w-px h-4 bg-zinc-300 mx-2"></div>
             <div className="text-[10px] text-zinc-400 font-mono flex-1">A3: fx =SUM(C1:C2)</div>
           </div>

           {/* Grid body */}
           <div className="flex-1 bg-white relative p-1 overflow-hidden" style={{ backgroundImage: 'linear-gradient(to right, #F0F0F0 1px, transparent 1px), linear-gradient(to bottom, #F0F0F0 1px, transparent 1px)', backgroundSize: '25% 33px' }}>
              <div className="absolute top-0 left-0 w-8 h-full bg-[#f8f9fa] border-r border-zinc-200 z-10"></div>
              
              {/* Fake Data Lines */}
              <div className="relative z-20 pl-8 pt-0 w-full font-mono text-xs">
                 <div className="h-[33px] border-b border-[#F0F0F0] flex items-center">
                    <span className="w-1/4 text-center font-bold text-zinc-400 text-[10px]">Data</span>
                    <span className="w-1/4 text-center font-bold text-zinc-400 text-[10px]">Motoboy</span>
                    <span className="w-1/4 text-center font-bold text-zinc-400 text-[10px]">Taxa Fixa</span>
                    <span className="w-1/4 text-center font-bold text-zinc-400 text-[10px]">Total C/Km</span>
                 </div>
                 <div className="h-[33px] border-b border-[#F0F0F0] flex items-center">
                    <span className="w-1/4 px-2 text-zinc-600">20/11</span>
                    <span className="w-1/4 px-2 text-zinc-600">Lucas S.</span>
                    <span className="w-1/4 px-2 text-zinc-600">R$ 55</span>
                    <span className="w-1/4 px-2 text-emerald-600 font-semibold">R$ 82.50</span>
                 </div>

                 {/* Células que animam vivas */}
                 <div className="h-[33px] border-b border-[#F0F0F0] flex items-center bg-emerald-50/30">
                    <span className={`w-1/4 px-2 transition-all duration-300 ${step >= 1 ? 'text-zinc-600' : 'text-transparent'}`}>20/11</span>
                    <span className={`w-1/4 px-2 transition-all duration-300 ${step >= 2 ? 'text-zinc-600' : 'text-transparent'}`}>Pedro K.</span>
                    <span className={`w-1/4 px-2 transition-all duration-300 ${step >= 3 ? 'text-zinc-600' : 'text-transparent'}`}>R$ 55</span>
                    <span className={`w-1/4 px-2 font-semibold transition-all duration-300 relative ${step >= 3 ? 'text-emerald-600 scale-100' : 'text-transparent scale-95'}`}>
                      R$ 95.00
                      {/* Efeito de flash verde de atualizacao no final do loop */}
                      {step === 3 && <div className="absolute inset-0 bg-emerald-400/20 blur-sm animate-pulse"></div>}
                    </span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // Fila de Pagamentos (Totem Screen)
  if (id === 'pagamento') {
    return (
       <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
         {/* Totem Mockup */}
         <div className="w-[280px] h-[400px] bg-gradient-to-b from-amber-500 to-amber-600 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border-8 border-amber-400/20">
            {/* Display Header */}
            <div className="h-20 bg-black/20 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
              <h3 className="text-white font-black text-xl tracking-tight uppercase">Cashout Fast</h3>
              <p className="text-amber-100 text-[10px] font-medium tracking-wide">Fim de turno? Retire sua senha</p>
            </div>

            {/* Content Button Area */}
            <div className="flex-1 flex items-center justify-center flex-col gap-4 relative z-10 p-6">
               <button className={`w-full py-6 rounded-2xl bg-white shadow-xl flex flex-col items-center gap-2 transform transition-all duration-200 ${step === 1 ? 'scale-95 bg-amber-50 shadow-inner' : 'hover:scale-105'}`}>
                 <Wallet className={`w-12 h-12 ${step === 1 ? 'text-amber-500 rotate-12' : 'text-zinc-800'}`} />
                 <span className="font-bold text-zinc-800 text-sm">Gerar Senha Financeiro</span>
               </button>
            </div>
            
            {/* Ticket Animation Slot (Bottom) */}
            <div className="h-10 w-full bg-zinc-900 border-t-4 border-zinc-800 flex justify-center mt-auto z-20 relative">
               <div className="w-3/4 h-2 bg-black rounded-b-full shadow-inner opacity-50 relative top-0"></div>
            </div>

            {/* O Papelzinho do Ticket caindo do slot */}
            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-[180px] bg-white border border-dashed border-zinc-300 shadow-md p-4 text-center transition-all duration-700 z-10
              ${step >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
            `}>
              <p className="text-[10px] text-zinc-500 font-mono uppercase border-b border-zinc-200 pb-2 mb-2">FilaLab Cashout</p>
              <h2 className="text-4xl font-black text-amber-500">045</h2>
              <p className="text-[10px] text-zinc-800 font-medium mt-1">Aguarde a chamada no TV</p>
              <div className={`mt-2 h-1 w-full bg-amber-100 rounded overflow-hidden ${step === 3 ? 'opacity-100' : 'opacity-0'}`}>
                <div className="h-full bg-amber-500 animate-pulse w-full"></div>
              </div>
            </div>

         </div>
       </div>
    );
  }

  // SISFOOD Webhook
  if (id === 'sisfood') {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <div className="w-full max-w-[500px] bg-background/50 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Sisfood POS */}
          <div className={`w-[140px] h-[180px] bg-red-600/10 border border-red-500/20 rounded-xl relative flex flex-col transition-all ${step === 0 ? 'scale-105 border-red-500' : 'scale-100'}`}>
             <div className="bg-red-600 px-3 py-1.5 rounded-t-xl flex justify-between items-center text-white">
               <span className="font-bold text-[10px]">Caixa Sisfood</span>
             </div>
             <div className="flex-1 p-2 flex flex-col justify-between">
                <div>
                   <div className="w-full h-2 bg-red-500/20 rounded mb-1.5"></div>
                   <div className="w-3/4 h-2 bg-red-500/20 rounded mb-1.5"></div>
                   <div className="w-full h-2 bg-red-500/20 rounded"></div>
                </div>
                {/* Botão Pressionando no step 0 */}
                <div className={`w-full py-1.5 bg-red-600 rounded text-center text-[9px] text-white font-bold tracking-tight shadow-md transition-all ${step === 0 ? 'scale-95 bg-red-700 shadow-inner' : ''}`}>
                  FINALIZAR PEDIDO
                </div>
             </div>
          </div>

          {/* O Webhook viajando! */}
          <div className="flex-1 flex justify-center items-center h-full relative min-h-[40px] sm:min-h-full">
            <div className="w-full h-[2px] bg-zinc-700/50 border-dashed border-t-2 border-zinc-700/50 absolute"></div>
            <div className={`absolute transition-all duration-700 ease-out z-10 
              ${step === 0 ? 'left-0 opacity-0 scale-50' : step === 1 ? 'left-1/2 -translate-x-1/2 opacity-100 scale-125' : 'left-[90%] opacity-0 scale-50'}
            `}>
               <div className="w-8 h-8 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.8)] flex items-center justify-center text-white">
                  <Zap className="w-4 h-4 animate-pulse" />
               </div>
            </div>
          </div>

          {/* Lado Direito: Dashboard FilaLab */}
          <div className={`w-[140px] h-[180px] bg-zinc-900 border border-white/10 rounded-xl flex flex-col transition-all ${step >= 2 ? 'shadow-[0_0_30px_rgba(16,185,129,0.2)] border-emerald-500/50' : ''}`}>
             <div className="bg-zinc-800 px-3 py-1.5 rounded-t-xl flex justify-between items-center">
               <span className="font-bold text-[10px] text-white">FilaLab Roteirista</span>
             </div>
             <div className="flex-1 p-2 flex flex-col gap-2">
                <div className="w-full p-2 rounded bg-white/5 border border-white/5 flex gap-2 items-center">
                   <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 flex justify-center items-center text-[8px] font-bold">1</div>
                   <div className="flex-1 h-2 bg-white/10 rounded"></div>
                </div>
                
                {/* Novo Card Aparecendo do Webhook (step >= 2) */}
                <div className={`w-full p-2 rounded bg-gradient-to-r from-emerald-500/20 to-transparent border border-emerald-500/30 flex gap-2 items-center transition-all duration-500
                   ${step >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'}
                `}>
                   <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex justify-center items-center text-[8px] font-bold animate-pulse">2</div>
                   <div className="flex-1 flex flex-col gap-1">
                     <span className="text-[8px] text-emerald-100 font-bold leading-none">PEDIDO 999</span>
                     <span className="text-[6px] text-white/50 leading-none">Bairro Centro</span>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    );
  }

  // Controle de Maquininhas (Drag & Drop Mockup)
  if (id === 'maquininhas') {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[450px] bg-background border border-white/10 rounded-2xl shadow-xl overflow-hidden flex">
          
          {/* Lado Motoboys */}
          <div className="w-1/2 bg-card p-4 border-r border-white/5 flex flex-col gap-3">
             <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">Motoboys em Rota</h4>
             
             {/* Motoboy 1 */}
             <div className="bg-white/5 border border-white/10 p-2 rounded-lg flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center"><span className="text-[10px]">LS</span></div>
                 <span className="text-xs font-semibold">Lucas</span>
               </div>
               <div className="text-[8px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Sem POS</div>
             </div>
             
             {/* Motoboy 2 (Alvo) */}
             <div className={`p-2 rounded-lg flex items-center justify-between transition-all duration-300
               ${step >= 2 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-white/5 border border-white/10'}
             `}>
               <div className="flex items-center gap-2">
                 <div className="w-6 h-6 rounded-full bg-secondary/80 flex items-center justify-center"><span className="text-[10px]">MK</span></div>
                 <span className="text-xs font-semibold">Marcos</span>
               </div>
               {/* Tag de Status muda no step 3 */}
               {step >= 2 ? (
                 <div className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">Equipado</div>
               ) : (
                 <div className="text-[8px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Sem POS</div>
               )}
             </div>
          </div>

          {/* Lado Maquininhas */}
          <div className="w-1/2 p-4 flex flex-col gap-3 relative bg-card/50">
             <h4 className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2 text-right">Terminais Livres</h4>
             
             {/* Maquininha fake que fica no painel */}
             <div className={`bg-cyan-500/10 border border-cyan-500/30 p-2 rounded-lg flex flex-col items-center justify-center h-[60px] cursor-pointer hover:bg-cyan-500/20 transition-all
               ${step >= 1 ? 'opacity-30 border-dashed bg-transparent' : 'opacity-100'}
             `}>
                <CreditCard className="w-5 h-5 text-cyan-500 mb-1" />
                <span className="text-[9px] font-bold text-cyan-500">POS-01 (Azul)</span>
             </div>

             <div className="bg-white/5 border border-white/10 p-2 rounded-lg flex flex-col items-center justify-center h-[60px]">
                <CreditCard className="w-5 h-5 text-zinc-500 mb-1" />
                <span className="text-[9px] font-bold text-zinc-500">POS-02 (Amarela)</span>
             </div>

             {/* Maquininha Animada! Drag & Drop visual Ghost */}
             <div className={`absolute top-[40px] right-[16px] w-[calc(100%-32px)] bg-cyan-500 border border-cyan-400 p-2 rounded-lg flex flex-col items-center transition-all duration-[800ms] shadow-2xl z-20 ease-in-out
               ${step === 0 ? 'opacity-0 scale-95' : step === 1 ? 'opacity-100 scale-105 shadow-[0_10px_30px_rgba(6,182,212,0.5)] -translate-x-8 translate-y-4' : 'opacity-0 -translate-x-[200px] translate-y-12 scale-50 rotate-[-10deg]'}
             `}>
               <CreditCard className="w-5 h-5 text-white mb-1 drop-shadow" />
               <span className="text-[9px] font-black tracking-wide text-white drop-shadow">POS-01</span>
             </div>

          </div>

        </div>
      </div>
    );
  }

  // Fallback genérico para ids não cadastrados (Garantia de segurança)
  return (
    <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
      <MonitorPlay className="w-16 h-16 animate-pulse text-muted-foreground mb-4" />
      <span className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">Sistema FilaLab</span>
    </div>
  );
}

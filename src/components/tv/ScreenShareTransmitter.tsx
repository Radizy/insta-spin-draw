import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Copy, Check, Tv, Radio, Shield, Settings, Info, ExternalLink, ChevronDown, ChevronUp, RefreshCw, Plus } from 'lucide-react';

export function ScreenShareTransmitter() {
  const { user } = useAuth();
  const [copiedServer, setCopiedServer] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedHls, setCopiedHls] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddingPlaylist, setIsAddingPlaylist] = useState(false);

  // Chave de transmissão padrão baseada na franquia ou "filalab"
  const streamKey = user?.franquiaId || 'filalab';
  const rtmpServer = 'rtmp://2.27.112.232/live';
  const hlsUrl = `https://dom-rtmfila.begyiq.easypanel.host/live/${streamKey}.m3u8`;

  // Monitora se o arquivo HLS está acessível (transmissão ativa)
  useEffect(() => {
    const checkStreamStatus = async () => {
      try {
        const response = await fetch(hlsUrl, { method: 'HEAD', cache: 'no-cache' });
        setIsLive(response.ok);
      } catch (err) {
        setIsLive(false);
      } finally {
        setHasCheckedStatus(true);
      }
    };

    checkStreamStatus();
    const interval = setInterval(checkStreamStatus, 5000);
    return () => clearInterval(interval);
  }, [hlsUrl]);

  // Monitor de Inatividade: Se passar 5 minutos sem transmissão (isLive = false), remove o item de todas as lojas
  useEffect(() => {
    let afkTimeout: NodeJS.Timeout;

    if (hasCheckedStatus && !isLive && user?.franquiaId) {
      console.log('[Transmitter] Sem transmissão ativa. Iniciando timer de 5 min para remoção automática...');
      afkTimeout = setTimeout(() => {
        removeTransmissionFromFranchise(true); // true indica que foi por timeout automático
      }, 300000); // 5 minutos = 300.000 ms
    }

    return () => {
      if (afkTimeout) {
        clearTimeout(afkTimeout);
      }
    };
  }, [isLive, hasCheckedStatus, user?.franquiaId]);

  const copyToClipboard = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  // Remove o item de transmissão de todas as lojas da franquia
  const removeTransmissionFromFranchise = async (isAuto = false) => {
    if (!user?.franquiaId) return;
    try {
      // 1. Busca todas as unidades da franquia
      const { data: unidades, error: uError } = await supabase
        .from('unidades')
        .select('id')
        .eq('franquia_id', user.franquiaId);
        
      if (uError || !unidades) throw uError || new Error('Nenhuma unidade encontrada');
      
      const unidadeIds = unidades.map(u => u.id);
      
      // 2. Deleta os itens do tipo 'transmissao' destas unidades
      const { error: dError } = await supabase
        .from('tv_playlist')
        .delete()
        .eq('tipo', 'transmissao')
        .in('unidade_id', unidadeIds);
        
      if (dError) throw dError;
      
      console.log('[Transmitter] Transmissão removida de todas as lojas.');
      if (isAuto) {
        toast.info('Item "Transmissão" removido das playlists por inatividade do OBS.');
      } else {
        toast.success('Transmissão removida de todas as lojas.');
      }
    } catch (err) {
      console.error('[Transmitter] Erro ao remover transmissão:', err);
      if (!isAuto) toast.error('Erro ao remover transmissão das lojas.');
    }
  };

  // Garante que o item de transmissão está na playlist de todas as lojas da franquia
  const addTransmissionToFranchise = async () => {
    if (!user?.franquiaId) return;
    setIsAddingPlaylist(true);
    try {
      // 1. Busca todas as unidades da franquia
      const { data: unidades, error: uError } = await supabase
        .from('unidades')
        .select('id')
        .eq('franquia_id', user.franquiaId);
        
      if (uError || !unidades) throw uError;
      
      // 2. Insere o item 'transmissao' nas playlists onde não existe
      let adicionadosCount = 0;
      for (const unidade of unidades) {
        const { data: existing } = await supabase
          .from('tv_playlist')
          .select('id')
          .eq('unidade_id', unidade.id)
          .eq('tipo', 'transmissao')
          .eq('ativo', true)
          .maybeSingle();
          
        if (!existing) {
          // Busca o maior valor de ordem atual da playlist da unidade para inserir no fim
          const { data: maxOrdem } = await supabase
            .from('tv_playlist')
            .select('ordem')
            .eq('unidade_id', unidade.id)
            .order('ordem', { ascending: false })
            .limit(1);
            
          const nextOrdem = maxOrdem && maxOrdem.length > 0 ? (maxOrdem[0].ordem + 1) : 1;
          
          await supabase.from('tv_playlist').insert({
            unidade_id: unidade.id,
            tipo: 'transmissao',
            url: null,
            ordem: nextOrdem,
            ativo: true,
            volume: 100
          });
          adicionadosCount++;
        }
      }
      
      toast.success(`Transmissão ativada! Adicionado a ${adicionadosCount} lojas novas.`);
    } catch (err) {
      console.error('[Transmitter] Erro ao adicionar na playlist:', err);
      toast.error('Erro ao adicionar transmissão nas lojas.');
    } finally {
      setIsAddingPlaylist(false);
    }
  };

  // Dispara o evento de sincronização em tempo real para todas as TVs receptoras
  const handleSync = () => {
    setIsSyncing(true);
    const channelName = `hls-broadcast-${streamKey}`;
    console.log('[Transmitter] Disparando hls-sync no canal:', channelName);
    const channel = supabase.channel(channelName);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'hls-sync',
          payload: {}
        });
        
        // Mantém o estado visual de loading por 1.5s e limpa a conexão
        setTimeout(() => {
          supabase.removeChannel(channel);
          setIsSyncing(false);
        }, 1500);
      }
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col mt-6 w-full max-w-4xl mx-auto shadow-sm transition-all duration-300">
      
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg transition-colors duration-300 ${
            isLive 
              ? 'bg-red-500/10 dark:bg-red-500/20 text-red-500' 
              : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}>
            <Radio className={`w-6 h-6 ${isLive ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              Transmissão Externa ao Vivo
              {isLive && (
                <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full animate-pulse select-none">
                  AO VIVO
                </span>
              )}
            </h3>
            <p className="text-muted-foreground text-xs md:text-sm">
              {isLive 
                ? 'Sua transmissão via OBS Studio está ativa e sendo exibida nas TVs.' 
                : 'Transmita a tela do seu computador ou estúdio usando o OBS Studio.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLive && showConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="text-xs gap-1.5 border-indigo-500/25 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 transition-all duration-200"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          )}

          {isLive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              {showConfig ? (
                <>Ocultar Configuração <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Ver Configuração OBS <ChevronDown className="w-4 h-4" /></>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Se estiver AO VIVO e NÃO estiver com a config expandida, exibe tela simplificada */}
      {isLive && !showConfig ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-red-500/20 animate-ping" />
            <span className="relative inline-flex rounded-full h-10 w-10 bg-red-500 items-center justify-center text-white">
              <Tv className="w-5 h-5" />
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-bold text-foreground">Sinal Conectado com Sucesso!</h4>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              O sistema FilaLab identificou a stream do OBS. As TVs que possuem o item <span className="font-semibold text-emerald-600 dark:text-emerald-400">Transmissão</span> na playlist já estão exibindo o sinal.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-center w-full max-w-lg">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              className="gap-2 px-5 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold w-full sm:w-auto"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizar TVs' : 'Sincronizar TVs'}
            </Button>
            
            <Button
              onClick={addTransmissionToFranchise}
              disabled={isAddingPlaylist}
              className="gap-2 px-5 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              Adicionar a todas as Lojas
            </Button>

            <a 
              href={hlsUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-400 font-semibold shrink-0"
            >
              Visualizar sinal HLS <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        /* Caso contrário (ou inativo, ou expandido), exibe painel completo de configuração */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Painel de Credenciais */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 select-none">
                <Shield className="w-4 h-4 text-emerald-500" />
                Dados para configurar o OBS
              </h4>

              {/* Servidor RTMP */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Servidor (URL RTMP):</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs overflow-x-auto border border-border/55 select-all font-mono">
                    {rtmpServer}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(rtmpServer, setCopiedServer)}
                    className="shrink-0 h-9"
                  >
                    {copiedServer ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Chave de Transmissão */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/80">Chave de Transmissão (Stream Key):</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-xs overflow-x-auto border border-border/55 select-all font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {streamKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(streamKey, setCopiedKey)}
                    className="shrink-0 h-9"
                  >
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* URL da Stream HLS */}
              <div className="space-y-1.5 pt-2 border-t border-border/50">
                <label className="text-xs font-bold text-foreground/90 flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-indigo-500" />
                  Link da Stream HLS (Detecção Automática):
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 p-2 rounded text-xs overflow-x-auto border border-indigo-500/20 select-all font-mono font-semibold">
                    {hlsUrl}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(hlsUrl, setCopiedHls)}
                    className="shrink-0 h-9 border-indigo-500/20 hover:bg-indigo-500/5"
                  >
                    {copiedHls ? <Check className="w-4 h-4 text-indigo-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal mt-1">
                  <strong>Vantagem:</strong> O FilaLab vincula esse link automaticamente na sua TV quando você usa o item <span className="font-bold text-indigo-500">Transmissão</span> na playlist. Não precisa cadastrar URL manualmente!
                </p>
              </div>
            </div>

            {/* Guia Passo a Passo */}
            <div className="bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-border/50 space-y-4">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2 select-none">
                <Settings className="w-4 h-4 text-slate-500" />
                Configurando no OBS Studio
              </h4>

              <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-foreground font-bold text-[10px]">1</span>
                  <span>No OBS, vá em <strong>Configurações</strong> e depois em <strong>Transmissão</strong>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-foreground font-bold text-[10px]">2</span>
                  <span>Mude o <strong>Serviço</strong> para <strong>Personalizado</strong>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-foreground font-bold text-[10px]">3</span>
                  <span>Cole o <strong>Servidor</strong> e a <strong>Chave de Transmissão</strong> copiados ao lado.</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-foreground font-bold text-[10px]">4</span>
                  <span>Na aba Saída, use o encoder <strong>x264 (H.264)</strong> para vídeo e <strong>AAC</strong> para áudio (obrigatórios).</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-foreground font-bold text-[10px]">5</span>
                  <span>Clique em <strong>Iniciar Transmissão</strong> no OBS. O status acima mudará para <strong>AO VIVO</strong> em alguns segundos!</span>
                </li>
              </ul>

              <div className="flex gap-2 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-lg border border-amber-500/20 text-[11px] leading-normal">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <strong>Importante:</strong> Mantenha a taxa de bits (Bitrate) recomendada de <strong>1500 a 2500 Kbps</strong> no OBS para garantir fluidez perfeita e evitar travamento nas TVs receptoras.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação Rápidos em Configuração */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-end border-t border-border/50 pt-4 w-full">
            <Button
              onClick={addTransmissionToFranchise}
              disabled={isAddingPlaylist}
              className="gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-full sm:w-auto text-xs"
            >
              <Plus className="w-4 h-4" />
              Adicionar Transmissão a Todas as Lojas
            </Button>
            <Button
              variant="outline"
              onClick={() => removeTransmissionFromFranchise(false)}
              className="gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/5 border-red-500/20 w-full sm:w-auto"
            >
              Remover Transmissão de Todas as Lojas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}





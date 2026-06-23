import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface HLSPlayerProps {
  url: string;
  volume: number;
  isActive: boolean;
}

export function HLSPlayer({ url, volume, isActive }: HLSPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const streamKey = user?.franquiaId || 'filalab';

  // Gerenciamento e inicialização do player HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset player state
    video.pause();
    video.src = '';
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (!isActive) return;

    // Configura volume inicial
    video.volume = volume / 100;
    video.muted = volume === 0;

    if (Hls.isSupported()) {
      console.log('[HLS TV] Inicializando hls.js para:', url);
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 6,
        maxBufferLength: 4,
        maxMaxBufferLength: 8,
        maxBufferSize: 15 * 1024 * 1024 // 15MB buffer max
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[HLS TV] Manifesto carregado. Iniciando play...');
        video.play().catch((err) => {
          console.warn('[HLS TV] Autoplay bloqueado pelo navegador. Silenciando para reproduzir...', err);
          video.muted = true;
          video.play().catch(e => console.error('[HLS TV] Falha crítica de autoplay:', e));
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS TV] Erro de rede fatal. Tentando recuperar em 5s...', data);
              setTimeout(() => {
                if (hlsRef.current === hls) {
                  hls.startLoad();
                }
              }, 5000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS TV] Erro de mídia fatal. Tentando recuperar...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS TV] Erro crítico irrecuperável. Reiniciando em 3s...', data);
              setTimeout(() => {
                if (hlsRef.current === hls) {
                  hls.loadSource(url);
                  hls.attachMedia(video);
                }
              }, 3000);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Suporte nativo ao HLS (ex: Safari / iOS)
      console.log('[HLS TV] Usando suporte HLS nativo para:', url);
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((err) => {
          console.warn('[HLS TV Native] Autoplay bloqueado. Silenciando...', err);
          video.muted = true;
          video.play().catch(e => console.error('[HLS TV Native] Falha crítica:', e));
        });
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, isActive]);

  // Atualiza o volume do vídeo em tempo real quando o prop volume for alterado
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume / 100;
      video.muted = volume === 0;
    }
  }, [volume]);

  // Canal Realtime para ouvir o comando de Sincronização e Volume
  useEffect(() => {
    if (!isActive || !user?.franquiaId) return;

    const channelName = `hls-broadcast-${streamKey}`;
    console.log('[HLS TV] Ouvindo canal de sincronização:', channelName);
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'hls-sync' }, (payload: any) => {
        console.log('[HLS TV] Comando de sincronização/volume recebido! Payload:', payload);
        const video = videoRef.current;
        const hls = hlsRef.current;
        
        // Se o payload contiver volume, atualiza em tempo real sem travar o vídeo
        if (payload?.payload && typeof payload.payload.volume === 'number') {
          const newVol = payload.payload.volume;
          console.log('[HLS TV] Atualizando volume via broadcast:', newVol);
          if (video) {
            video.volume = newVol / 100;
            video.muted = newVol === 0;
          }
          return;
        }

        // Caso contrário, recarrega a fonte do player (sincronização de delay)
        if (video && hls) {
          hls.loadSource(url);
          video.play().catch(e => console.error('[HLS TV] Erro ao sincronizar play:', e));
        } else if (video) {
          // Fallback nativo
          video.src = url;
          video.play().catch(e => console.error('[HLS TV Native] Erro ao sincronizar play:', e));
        }
      })
      .subscribe();

    return () => {
      console.log('[HLS TV] Removendo canal de sincronização:', channelName);
      supabase.removeChannel(channel);
    };
  }, [isActive, streamKey, url, user?.franquiaId]);

  return (
    <div className="absolute inset-0 bg-black w-full h-full flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-fill bg-black"
        playsInline
        autoPlay
      />
    </div>
  );
}


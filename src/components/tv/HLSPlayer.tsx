import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HLSPlayerProps {
  url: string;
  volume: number;
  isActive: boolean;
}

export function HLSPlayer({ url, volume, isActive }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

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
        maxMaxBufferLength: 10,
        enableWorker: true,
        lowLatencyMode: true
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
              console.warn('[HLS TV] Erro de rede fatal. Tentando recuperar...', data);
              hls.startLoad();
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
  }, [url, isActive, volume]);

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

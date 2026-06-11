import { useEffect, useRef, useState } from 'react';

// Estende tipagens do Window para o YouTube IFrame API
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface YouTubePlayerProps {
  url: string;
  volume: number;
  isActive: boolean;
}

// Extrai o VideoID ou PlaylistID de uma URL
function extractVideoOrPlaylistId(rawUrl: string): { videoId: string | null; playlistId: string | null } {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace('www.', '');
    let videoId: string | null = null;
    let playlistId: string | null = url.searchParams.get('list');

    if (hostname === 'youtu.be') {
      videoId = url.pathname.slice(1).split('?')[0];
    } else if (hostname === 'youtube.com' || hostname === 'youtube-nocookie.com') {
      const path = url.pathname;
      if (path.startsWith('/embed/')) {
        videoId = path.replace('/embed/', '').split('?')[0];
        if (videoId === 'videoseries') videoId = null;
      } else if (path.startsWith('/shorts/')) {
        videoId = path.split('/shorts/')[1]?.split('?')[0];
      } else if (path.startsWith('/live/')) {
        videoId = path.split('/live/')[1]?.split('?')[0];
      } else {
        videoId = url.searchParams.get('v');
      }
    }
    return { videoId, playlistId };
  } catch {
    return { videoId: null, playlistId: null };
  }
}

export function YouTubePlayer({ url, volume, isActive }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    // Carrega o script da API do YouTube se não existir na página
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        setIsApiReady(true);
      };
    } else if (window.YT && window.YT.Player) {
      setIsApiReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    const { videoId, playlistId } = extractVideoOrPlaylistId(url);
    if (!videoId && !playlistId) return;

    // Se já existir um player, limpa antes de recriar
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

    const playerVars: any = {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      modestbranding: 1,
      rel: 0,
    };

    if (playlistId) {
      playerVars.listType = 'playlist';
      playerVars.list = playlistId;
      if (videoId) {
        playerVars.playlist = videoId; // Loop requires playlist
      }
    } else if (videoId) {
      playerVars.playlist = videoId;
      playerVars.loop = 1;
    }

    const loadId = videoId || '';

    // Criação do objeto do player
    playerRef.current = new window.YT.Player(containerRef.current, {
      height: '100%',
      width: '100%',
      videoId: loadId,
      playerVars,
      events: {
        onReady: (event: any) => {
          const isLive = event.target.getVideoData()?.isLive;

          if (volume > 0) {
            event.target.unMute();
            event.target.setVolume(volume);
          } else {
            event.target.mute();
          }
          
          if (isActive) {
            event.target.playVideo();
          } else {
            if (isLive) {
              event.target.mute();
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
          }
        },
      }
    });

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.error(e);
        }
        playerRef.current = null;
      }
    };
  }, [url, isApiReady]); // Recria o player se a URL mudar

  // Sincroniza volume e estado play/pause com `isActive` dinamicamente
  useEffect(() => {
    if (!playerRef.current || typeof playerRef.current.playVideo !== 'function') return;

    try {
      const isLive = playerRef.current.getVideoData()?.isLive;

      if (isActive) {
        if (volume > 0) {
          playerRef.current.unMute();
          playerRef.current.setVolume(volume);
        } else {
          playerRef.current.mute();
        }
        
        if (isLive) {
          const duration = playerRef.current.getDuration();
          playerRef.current.seekTo(duration || 999999, true);
        }

        playerRef.current.playVideo();
      } else {
        if (isLive) {
          playerRef.current.mute();
        } else {
          playerRef.current.pauseVideo();
        }
      }
    } catch (e) {
      console.error('[YouTubePlayer] Erro ao alterar estado:', e);
    }
  }, [isActive, volume]);

  return (
    <div className="w-full h-full bg-black pointer-events-none overflow-hidden relative flex items-center justify-center">
      <div className="w-full h-full pointer-events-none absolute inset-0">
        <div ref={containerRef} />
      </div>
    </div>
  );
}

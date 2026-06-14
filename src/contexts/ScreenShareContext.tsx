import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const getIceServers = () => {
  const customTurnUrl = import.meta.env.VITE_TURN_URL;
  const customTurnUsername = import.meta.env.VITE_TURN_USERNAME;
  const customTurnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const stunUrls = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
  ];

  const servers = stunUrls.map(url => ({ urls: url }));

  if (customTurnUrl) {
    console.log('[WebRTC Context] Usando servidor TURN customizado:', customTurnUrl);
    const urls = customTurnUrl.split(',').map((u: string) => u.trim());
    urls.forEach((url: string) => {
      servers.push({
        urls: url,
        username: customTurnUsername || '',
        credential: customTurnCredential || ''
      });
    });
  } else {
    servers.push(
      { urls: 'stun:openrelay.metered.ca:80' },
      { urls: 'stun:openrelay.metered.ca:443' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turns:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turns:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    );
  }

  return servers;
};

const getConfiguration = () => ({
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10
});

interface ScreenShareContextType {
  isBroadcasting: boolean;
  stream: MediaStream | null;
  connectedTVs: number;
  connectedTVsNames: string[];
  videoFit: 'contain' | 'cover';
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  crop: { top: number; bottom: number; left: number; right: number };
  isAnotherBroadcasterActive: boolean;
  volume: number;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  changeVideoFit: (fit: 'contain' | 'cover') => void;
  changeVolume: (val: number) => void;
  resetCrop: () => void;
  handleCornerDragStart: (corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', e: React.MouseEvent) => void;
  handleBodyDragStart: (e: React.MouseEvent) => void;
  handleSliderChange: (edge: 'top' | 'bottom' | 'left' | 'right', value: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  previewVideoRef: React.RefObject<HTMLVideoElement>;
}

const ScreenShareContext = createContext<ScreenShareContextType | undefined>(undefined);

export function ScreenShareProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connectedTVs, setConnectedTVs] = useState<number>(0);
  const [connectedTVsNames, setConnectedTVsNames] = useState<string[]>([]);
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('contain');
  const [showPreview, setShowPreview] = useState(false);
  const [crop, setCrop] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [isAnotherBroadcasterActive, setIsAnotherBroadcasterActive] = useState(false);
  const [volume, setVolume] = useState<number>(50); // Default to 50%

  const channelRef = useRef<any>(null);
  const pcsRef = useRef<{ [tvId: string]: RTCPeerConnection }>({});
  const iceCandidatesQueuesRef = useRef<{ [tvId: string]: RTCIceCandidateInit[] }>({});
  const streamRef = useRef<MediaStream | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const videoFitRef = useRef<'contain' | 'cover'>('contain');
  const containerRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef(crop);
  const volumeRef = useRef(volume);
  const tvsNamesRef = useRef<{ [tvId: string]: string }>({});
  
  const isBroadcastingRef = useRef(isBroadcasting);
  useEffect(() => {
    isBroadcastingRef.current = isBroadcasting;
  }, [isBroadcasting]);

  // Keep refs synced with states
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  useEffect(() => {
    videoFitRef.current = videoFit;
  }, [videoFit]);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    if (!user?.franquiaId) return;
    
    // Franchise-wide channel
    const channelName = `webrtc-${user.franquiaId}`;
    const channel = supabase.channel(channelName);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];
        // Verifica se há alguma outra sessão transmitindo (excluindo nós mesmos)
        const anyoneBroadcasting = presences.some((p: any) => p.isBroadcasting);
        setIsAnotherBroadcasterActive(!isBroadcastingRef.current && anyoneBroadcasting);
      })
      .on('broadcast', { event: 'tv-ready' }, async ({ payload }) => {
        const { tvId, lojaNome } = payload;
        console.log('[Transmitter] tv-ready recebido do receptor:', tvId, 'Loja:', lojaNome);
        
        tvsNamesRef.current[tvId] = lojaNome || 'TV';
        
        const currentStream = streamRef.current;
        if (!currentStream) {
          console.warn('[Transmitter] tv-ready recebido mas streamRef.current está nulo!');
          return;
        }

        // Close any pre-existing connection for this TV before starting a new negotiation
        if (pcsRef.current[tvId]) {
          console.log(`[Transmitter] Fechando RTCPeerConnection antiga de TV ${tvId} antes de renegociar`);
          try {
            pcsRef.current[tvId].close();
          } catch (e) {
            console.error('[Transmitter] Erro ao fechar conexão antiga:', e);
          }
        }

        iceCandidatesQueuesRef.current[tvId] = [];
        const pc = new RTCPeerConnection(getConfiguration());
        pcsRef.current[tvId] = pc;
        
        pc.onconnectionstatechange = () => {
          console.log(`[Transmitter] Connection state changed for TV ${tvId}:`, pc.connectionState);
          if (pc.connectionState === 'connected') {
            setConnectedTVs(prev => prev + 1);
            setConnectedTVsNames(prev => {
              const name = tvsNamesRef.current[tvId] || 'TV';
              if (!prev.includes(name)) {
                return [...prev, name];
              }
              return prev;
            });
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setConnectedTVs(prev => Math.max(0, prev - 1));
            const removedName = tvsNamesRef.current[tvId];
            delete pcsRef.current[tvId];
            delete iceCandidatesQueuesRef.current[tvId];
            delete tvsNamesRef.current[tvId];
            
            if (removedName) {
              setConnectedTVsNames(prev => {
                const hasAnotherOfSameLoja = Object.values(tvsNamesRef.current).includes(removedName);
                if (!hasAnotherOfSameLoja) {
                  return prev.filter(name => name !== removedName);
                }
                return prev;
              });
            }
          }
        };

        currentStream.getTracks().forEach(track => pc.addTrack(track, currentStream));
        
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            console.log(`[Transmitter] Enviando ICE Candidate local para TV ${tvId}:`, e.candidate.candidate);
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: e.candidate, to: tvId, from: 'broadcaster' }
            });
          }
        };
        
        console.log(`[Transmitter] Criando e enviando OFFER para TV ${tvId}`);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: { offer, to: tvId }
        });

        // Envia o ajuste de tela atual para essa TV recém conectada
        channel.send({
          type: 'broadcast',
          event: 'video-fit-change',
          payload: { fit: videoFitRef.current }
        });

        // Envia o recorte de tela atual para essa TV recém conectada
        channel.send({
          type: 'broadcast',
          event: 'video-crop-change',
          payload: { crop: cropRef.current }
        });

        // Envia o volume atual para essa TV recém conectada
        channel.send({
          type: 'broadcast',
          event: 'video-volume-change',
          payload: { volume: volumeRef.current }
        });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        const { answer, from } = payload;
        console.log('[Transmitter] ANSWER recebido da TV:', from);
        const pc = pcsRef.current[from];
        if (pc) {
          await pc.setRemoteDescription(answer);
          console.log('[Transmitter] Remote description salva com sucesso para:', from);
          
          // Process queued candidates for this TV
          const queue = iceCandidatesQueuesRef.current[from] || [];
          console.log(`[Transmitter] Processando ${queue.length} candidatos ICE na fila para:`, from);
          while (queue.length > 0) {
            const candidate = queue.shift();
            if (candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('[Transmitter] Erro ao adicionar candidato ICE da fila:', e));
            }
          }
        } else {
          console.warn('[Transmitter] ANSWER recebido mas RTCPeerConnection correspondente não existe para:', from);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        const { candidate, to, from } = payload;
        if (to === 'broadcaster') {
          console.log('[Transmitter] ICE candidate recebido de:', from, candidate?.candidate);
          const pc = pcsRef.current[from];
          if (pc) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('[Transmitter] Erro ao adicionar candidato ICE:', e));
            } else {
              console.log('[Transmitter] Adicionando candidato ICE na fila para:', from);
              if (!iceCandidatesQueuesRef.current[from]) {
                iceCandidatesQueuesRef.current[from] = [];
              }
              iceCandidatesQueuesRef.current[from].push(candidate);
            }
          } else {
            console.warn('[Transmitter] ICE candidate recebido mas RTCPeerConnection correspondente não existe para:', from);
          }
        }
      })
      .subscribe((status: string, err?: any) => {
        if (err) {
          console.error('[Transmitter] Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });
      
    return () => {
      supabase.removeChannel(channel);
      Object.values(pcsRef.current).forEach(pc => pc.close());
      pcsRef.current = {};
      
    };
  }, [user?.franquiaId]);

  const startScreenShare = async () => {
    try {
      if (channelRef.current) {
        const state = channelRef.current.presenceState();
        const activeBroadcasters = Object.values(state).flat().filter((p: any) => p.isBroadcasting);
        if (activeBroadcasters.length > 0) {
          toast.error('Outra loja da franquia já está transmitindo no momento.');
          return;
        }
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
          frameRate: { ideal: 60, max: 60 }
        },
        audio: true
      });
      
      setStream(displayStream);
      streamRef.current = displayStream;
      setIsBroadcasting(true);
      
      displayStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
      
      if (channelRef.current) {
        channelRef.current.track({ isBroadcasting: true });
        channelRef.current.send({ type: 'broadcast', event: 'broadcast-started', payload: {} });
      }
      

      
      toast.success('Transmissão iniciada! As TVs da franquia agora podem conectar.');
    } catch (err) {
      console.error('Error starting screen share:', err);
      toast.error('Erro ao acessar a tela. Permissão negada?');
    }
  };

  const stopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setStream(null);
    setIsBroadcasting(false);
    Object.values(pcsRef.current).forEach(pc => pc.close());
    pcsRef.current = {};
    tvsNamesRef.current = {};
    setConnectedTVs(0);
    setConnectedTVsNames([]);
    
    if (channelRef.current) {
      channelRef.current.track({ isBroadcasting: false });
      channelRef.current.send({ type: 'broadcast', event: 'broadcast-stopped', payload: {} });
    }



    toast.info('Transmissão encerrada.');
  };

  const changeVideoFit = (fit: 'contain' | 'cover') => {
    setVideoFit(fit);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'video-fit-change',
        payload: { fit }
      });
    }
  };

  const changeVolume = (val: number) => {
    setVolume(val);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'video-volume-change',
        payload: { volume: val }
      });
    }
  };

  const resetCrop = () => {
    const defaultCrop = { top: 0, bottom: 0, left: 0, right: 0 };
    setCrop(defaultCrop);
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'video-crop-change',
        payload: { crop: defaultCrop }
      });
    }
  };

  const handleSliderChange = (edge: 'top' | 'bottom' | 'left' | 'right', value: number) => {
    setCrop(prev => {
      let next = { ...prev };
      if (edge === 'top') {
        next.top = Math.max(0, Math.min(value, 100 - prev.bottom - 5));
      } else if (edge === 'bottom') {
        next.bottom = Math.max(0, Math.min(value, 100 - prev.top - 5));
      } else if (edge === 'left') {
        next.left = Math.max(0, Math.min(value, 100 - prev.right - 5));
      } else if (edge === 'right') {
        next.right = Math.max(0, Math.min(value, 100 - prev.left - 5));
      }
      
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'video-crop-change',
          payload: { crop: next }
        });
      }
      return next;
    });
  };

  const handleCornerDragStart = (corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right', startEvent: React.MouseEvent) => {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.clientX - rect.left;
      const y = moveEvent.clientY - rect.top;
      
      const pctX = Math.max(0, Math.min(100, (x / rect.width) * 100));
      const pctY = Math.max(0, Math.min(100, (y / rect.height) * 100));
      
      setCrop(prev => {
        let next = { ...prev };
        if (corner === 'top-left') {
          next.left = Math.max(0, Math.min(pctX, 100 - prev.right - 5));
          next.top = Math.max(0, Math.min(pctY, 100 - prev.bottom - 5));
        } else if (corner === 'top-right') {
          next.right = Math.max(0, Math.min(100 - pctX, 100 - prev.left - 5));
          next.top = Math.max(0, Math.min(pctY, 100 - prev.bottom - 5));
        } else if (corner === 'bottom-left') {
          next.left = Math.max(0, Math.min(pctX, 100 - prev.right - 5));
          next.bottom = Math.max(0, Math.min(100 - pctY, 100 - prev.top - 5));
        } else if (corner === 'bottom-right') {
          next.right = Math.max(0, Math.min(100 - pctX, 100 - prev.left - 5));
          next.bottom = Math.max(0, Math.min(100 - pctY, 100 - prev.top - 5));
        }
        
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'video-crop-change',
            payload: { crop: next }
          });
        }
        return next;
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleBodyDragStart = (startEvent: React.MouseEvent) => {
    startEvent.preventDefault();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const initialCrop = { ...cropRef.current };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100;
      
      setCrop(() => {
        let next = { ...initialCrop };
        let newLeft = initialCrop.left + deltaX;
        let newRight = initialCrop.right - deltaX;
        
        if (newLeft < 0) {
          newRight += newLeft;
          newLeft = 0;
        }
        if (newRight < 0) {
          newLeft += newRight;
          newRight = 0;
        }
        
        let newTop = initialCrop.top + deltaY;
        let newBottom = initialCrop.bottom - deltaY;
        
        if (newTop < 0) {
          newBottom += newTop;
          newTop = 0;
        }
        if (newBottom < 0) {
          newTop += newBottom;
          newBottom = 0;
        }
        
        next.left = Math.max(0, Math.min(100, newLeft));
        next.right = Math.max(0, Math.min(100, newRight));
        next.top = Math.max(0, Math.min(100, newTop));
        next.bottom = Math.max(0, Math.min(100, newBottom));
        
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'video-crop-change',
            payload: { crop: next }
          });
        }
        return next;
      });
    };
    
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <ScreenShareContext.Provider value={{
      isBroadcasting,
      stream,
      connectedTVs,
      connectedTVsNames,
      videoFit,
      showPreview,
      setShowPreview,
      crop,
      isAnotherBroadcasterActive,
      volume,
      startScreenShare,
      stopScreenShare,
      changeVideoFit,
      changeVolume,
      resetCrop,
      handleCornerDragStart,
      handleBodyDragStart,
      handleSliderChange,
      containerRef,
      previewVideoRef
    }}>
      {children}
    </ScreenShareContext.Provider>
  );
}

export function useScreenShare() {
  const context = useContext(ScreenShareContext);
  if (context === undefined) {
    throw new Error('useScreenShare must be used within a ScreenShareProvider');
  }
  return context;
}

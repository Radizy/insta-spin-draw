import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUnit } from '@/contexts/UnitContext';
import { MonitorPlay } from 'lucide-react';

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
    console.log('[WebRTC Receiver] Usando servidor TURN customizado:', customTurnUrl);
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

interface ScreenShareReceiverProps {
  isActive: boolean;
  onStreamChange: (stream: MediaStream | null) => void;
  onCropChange: (crop: { top: number; bottom: number; left: number; right: number }) => void;
  onFitChange: (fit: 'contain' | 'cover') => void;
  onVolumeChange: (volume: number) => void;
  storeName?: string;
}

export function ScreenShareReceiver({ 
  isActive, 
  onStreamChange, 
  onCropChange, 
  onFitChange, 
  onVolumeChange,
  storeName
}: ScreenShareReceiverProps) {
  const { user } = useAuth();
  const { selectedUnit } = useUnit();
  
  const storeNameRef = useRef(storeName);
  useEffect(() => {
    storeNameRef.current = storeName;
  }, [storeName]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const tvIdRef = useRef(`tv-${Math.random().toString(36).substring(7)}`);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  
  const [debugMsg, setDebugMsg] = useState<string>('Aguardando...');
  const [pcState, setPcState] = useState<string>('nenhuma');
  const [videoFit, setVideoFit] = useState<'contain' | 'cover'>('contain');
  const [crop, setCrop] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [volume, setVolume] = useState<number>(50); // Default to 50%
  
  // Keep stream state synced in a ref for the interval
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => { streamRef.current = stream; }, [stream]);

  // Bubble state changes up to parent
  useEffect(() => {
    onStreamChange(stream);
  }, [stream, onStreamChange]);

  useEffect(() => {
    onCropChange(crop);
  }, [crop, onCropChange]);

  useEffect(() => {
    onFitChange(videoFit);
  }, [videoFit, onFitChange]);

  useEffect(() => {
    onVolumeChange(volume);
  }, [volume, onVolumeChange]);

  useEffect(() => {
    if (!user?.franquiaId) {
      console.warn('[Receiver] user.franquiaId não definido, pulando inicialização do receptor');
      return;
    }
    
    const channelName = `webrtc-${user.franquiaId}`;
    console.log('[Receiver] Inicializando canal de sinalização:', channelName);
    const channel = supabase.channel(channelName);
    
    channel
      .on('broadcast', { event: 'broadcast-started' }, () => {
        console.log('[Receiver] Sinal broadcast-started recebido do transmissor');
        setDebugMsg('Sinal de início recebido, enviando tv-ready');
        channel.send({ type: 'broadcast', event: 'tv-ready', payload: { tvId: tvIdRef.current, lojaNome: storeNameRef.current || selectedUnit || user?.unidade || 'TV' } });
      })
      .on('broadcast', { event: 'broadcast-stopped' }, () => {
        console.log('[Receiver] Sinal broadcast-stopped recebido');
        setStream(null);
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
      })
      .on('broadcast', { event: 'video-fit-change' }, ({ payload }) => {
        setVideoFit(payload.fit);
      })
      .on('broadcast', { event: 'video-crop-change' }, ({ payload }) => {
        setCrop(payload.crop);
      })
      .on('broadcast', { event: 'video-volume-change' }, ({ payload }) => {
        setVolume(payload.volume);
      })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        const { offer, to } = payload;
        if (to !== tvIdRef.current) return;
        
        console.log('[Receiver] OFFER recebido do transmissor para esta TV');
        setDebugMsg('Recebeu offer, criando PC');
        if (pcRef.current) {
          pcRef.current.close();
        }
        
        iceCandidateQueue.current = [];
        const pc = new RTCPeerConnection(getConfiguration());
        pcRef.current = pc;

        pc.ontrack = (e) => {
          console.log('[Receiver] Track recebida com sucesso de vídeo/áudio!');
          setDebugMsg('Track recebida!');
          setStream(e.streams[0]);
        };
        
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            console.log('[Receiver] Enviando ICE Candidate local para transmissor:', e.candidate.candidate);
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: e.candidate, to: 'broadcaster', from: tvIdRef.current }
            });
          }
        };
        
        pc.onconnectionstatechange = () => {
          console.log('[Receiver] Connection state mudou para:', pc.connectionState);
          setPcState(pc.connectionState);
          if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            setStream(null);
            if (pcRef.current === pc) {
              pc.close();
              pcRef.current = null;
            }
            if (channelRef.current && pc.connectionState !== 'closed') {
              console.log('[Receiver] Conexão falhou ou desconectou. Solicitando renegociação imediata...');
              setDebugMsg('Conexão falhou. Tentando reconectar...');
              channelRef.current.send({ type: 'broadcast', event: 'tv-ready', payload: { tvId: tvIdRef.current, lojaNome: storeNameRef.current || selectedUnit || user?.unidade || 'TV' } });
            }
          }
        };

        console.log('[Receiver] Configurando descrição remota (OFFER)...');
        await pc.setRemoteDescription(offer);
        setDebugMsg('Remote desc set. Gerando answer...');
        
        // Process queued ICE candidates
        console.log(`[Receiver] Processando ${iceCandidateQueue.current.length} candidatos ICE na fila.`);
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('[Receiver] Erro ao adicionar candidato ICE da fila:', e));
        }
 
        console.log('[Receiver] Criando e enviando ANSWER...');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        setDebugMsg('Enviando answer...');
        
        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { answer, from: tvIdRef.current }
        });
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        const { candidate, to } = payload;
        if (to === tvIdRef.current && pcRef.current) {
          console.log('[Receiver] ICE candidate recebido do transmissor:', candidate?.candidate);
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error('[Receiver] Erro ao adicionar ICE candidate:', e));
          } else {
            console.log('[Receiver] Adicionando candidato ICE na fila (remoteDescription ainda não definida)');
            iceCandidateQueue.current.push(candidate);
          }
        }
      })
      .subscribe((status: string, err?: any) => {
        if (err) {
          console.error('[Receiver] Subscription error:', err);
          setDebugMsg(`Canal: ${status} (Erro: ${err.message || JSON.stringify(err)})`);
        }
        console.log('[Receiver] Status da subscrição de sinalização:', status);
        setDebugMsg(`Canal: ${status}`);
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
          console.log('[Receiver] Canal SUBSCRIBED, enviando tv-ready inicial');
          channel.send({ type: 'broadcast', event: 'tv-ready', payload: { tvId: tvIdRef.current, lojaNome: storeNameRef.current || selectedUnit || user?.unidade || 'TV' } });
        }
      });
      
    // Robust connection: Ping Transmitter every 4 seconds if not connected and not actively negotiating
    const pingInterval = setInterval(() => {
      const pc = pcRef.current;
      const isNegotiating = pc && (
        pc.connectionState === 'connecting' || 
        pc.iceConnectionState === 'checking'
      );

      if (!streamRef.current && channelRef.current && !isNegotiating) {
        setDebugMsg(prev => prev.endsWith('.') ? 'Ping de reconexão' : 'Ping de reconexão.');
        console.log('[Receiver] Enviando ping tv-ready para restabelecer stream...');
        channelRef.current.send({ type: 'broadcast', event: 'tv-ready', payload: { tvId: tvIdRef.current, lojaNome: storeNameRef.current || selectedUnit || user?.unidade || 'TV' } });
      }
    }, 4000);

    return () => {
      clearInterval(pingInterval);
      supabase.removeChannel(channel);
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, [user?.franquiaId, selectedUnit]);

  return null;
}

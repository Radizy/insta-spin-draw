import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MonitorUp, MonitorOff, Users, RefreshCw, Volume2 } from 'lucide-react';
import { useScreenShare } from '@/contexts/ScreenShareContext';

export function ScreenShareTransmitter() {
  const {
    isBroadcasting,
    stream,
    connectedTVs,
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
  } = useScreenShare();

  const [measuredFps, setMeasuredFps] = useState<number | null>(null);
  const [streamSettings, setStreamSettings] = useState<{ width?: number; height?: number; frameRate?: number } | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);

  // Monitora as configurações do track de vídeo (Resolução e FPS nominal)
  useEffect(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const updateSettings = () => {
          const settings = videoTrack.getSettings();
          setStreamSettings({
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate
          });
        };
        
        updateSettings();
        
        // Alguns navegadores atualizam as configurações dinamicamente se o track mudar
        videoTrack.addEventListener('configurationchange', updateSettings);
        return () => {
          videoTrack.removeEventListener('configurationchange', updateSettings);
        };
      }
    } else {
      setStreamSettings(null);
    }
  }, [stream]);

  // Mede o FPS real renderizado no elemento de vídeo de preview
  useEffect(() => {
    const videoEl = previewVideoRef.current;
    if (!videoEl || !showPreview || !stream) {
      setMeasuredFps(null);
      return;
    }

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;
    let callbackId: number;

    const updateFps = () => {
      const now = performance.now();
      frameCount++;
      const elapsed = now - lastTime;
      
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        setMeasuredFps(fps);
        frameCount = 0;
        lastTime = now;
      }
    };

    if ('requestVideoFrameCallback' in videoEl) {
      const doCallback = () => {
        updateFps();
        callbackId = (videoEl as any).requestVideoFrameCallback(doCallback);
      };
      callbackId = (videoEl as any).requestVideoFrameCallback(doCallback);
    } else {
      const loop = () => {
        updateFps();
        animationFrameId = requestAnimationFrame(loop);
      };
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      if (callbackId && 'cancelVideoFrameCallback' in videoEl) {
        (videoEl as any).cancelVideoFrameCallback(callbackId);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [stream, showPreview, previewVideoRef]);

  // Re-bind the stream to the preview video element on mount / state change
  useEffect(() => {
    const video = previewVideoRef.current;
    if (video && stream && showPreview) {
      video.srcObject = stream;
      video.play().catch(e => console.error('Preview play error:', e));
      
      const updateAspect = () => {
        if (video.videoWidth && video.videoHeight) {
          setVideoAspectRatio(video.videoWidth / video.videoHeight);
        }
      };
      
      video.addEventListener('loadedmetadata', updateAspect);
      if (video.readyState >= 1) {
        updateAspect();
      }
      
      return () => {
        video.removeEventListener('loadedmetadata', updateAspect);
      };
    }
  }, [stream, showPreview, previewVideoRef]);

  return (
    <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center mt-6">
      <div className="w-full space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Transmissão para a TV</h3>
          <p className="text-muted-foreground text-sm">
            Compartilhe a tela deste computador para TODAS as TVs da franquia. Apenas uma loja pode transmitir por vez.
          </p>
        </div>
        
        {isBroadcasting && (
          <div className="flex flex-col items-center space-y-4 animate-fade-in">
            <div className="flex justify-center items-center gap-4 py-2">
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full" /> AO VIVO
              </div>
              <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> {connectedTVs} TV(s) conectadas
              </div>
            </div>



            {/* Img Fit Control */}
            <div className="flex flex-col items-center space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-border/50 w-full max-w-md">
              <p className="text-xs font-bold text-muted-foreground select-none">Ajuste da Imagem na TV:</p>
              <div className="flex gap-2">
                <Button 
                  variant={videoFit === 'contain' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeVideoFit('contain')}
                  className={videoFit === 'contain' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent' : ''}
                >
                  Ajustar (Com Bordas)
                </Button>
                <Button 
                  variant={videoFit === 'cover' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => changeVideoFit('cover')}
                  className={videoFit === 'cover' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent' : ''}
                >
                  Preencher Tela (Recortar)
                </Button>
              </div>
            </div>

            {/* Volume control */}
            <div className="flex flex-col items-center space-y-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-border/50 w-full max-w-md">
              <div className="flex justify-between text-xs font-bold text-muted-foreground w-full select-none">
                <span className="flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5" /> 
                  Volume da Transmissão (TV):
                </span>
                <span>{volume}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={volume}
                onChange={(e) => changeVolume(parseInt(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
              />
            </div>

            <div className="flex items-center space-x-2 py-1 select-none">
              <input 
                type="checkbox" 
                id="toggle-preview" 
                checked={showPreview} 
                onChange={(e) => setShowPreview(e.target.checked)}
                className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="toggle-preview" className="text-sm font-medium cursor-pointer">
                Mostrar Pré-visualização local
              </label>
            </div>
            
            {showPreview && (
              <div className="flex flex-col items-center space-y-4 w-full animate-fade-in">
                <p className="text-xs text-muted-foreground select-none">Arraste as bordas/cantos da caixa de seleção ou use os controles abaixo:</p>
                
                {/* Visual crop selection container */}
                <div 
                  ref={containerRef}
                  className="relative w-full max-w-md bg-black rounded-xl overflow-hidden border border-border shadow-md select-none"
                  style={{ aspectRatio: videoAspectRatio }}
                >
                  {/* HUD de Estatísticas (FPS & Resolução) */}
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md text-white text-[11px] font-mono py-1.5 px-2.5 rounded-lg border border-white/10 flex items-center gap-2 select-none z-50 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold">
                      {streamSettings?.width && streamSettings?.height 
                        ? `${streamSettings.width}x${streamSettings.height}` 
                        : 'Resolvendo...'}
                    </span>
                    <span className="text-white/20">|</span>
                    <span>
                      FPS Preview: <span className="font-bold text-emerald-400">{measuredFps ?? '--'}</span>
                      {streamSettings?.frameRate && ` (Nominal: ${Math.round(streamSettings.frameRate)})`}
                    </span>
                  </div>

                  {/* Video rendered standard (un-cropped) */}
                  <video 
                    ref={previewVideoRef} 
                    className="w-full h-full object-fill bg-black"
                    muted 
                    playsInline
                  />

                  {/* Dark overlays (shaded areas outside crop box) */}
                  <div 
                    className="absolute top-0 left-0 right-0 bg-black/60 pointer-events-none"
                    style={{ height: `${crop.top}%` }}
                  />
                  <div 
                    className="absolute bottom-0 left-0 right-0 bg-black/60 pointer-events-none"
                    style={{ height: `${crop.bottom}%` }}
                  />
                  <div 
                    className="absolute left-0 bg-black/60 pointer-events-none"
                    style={{ 
                      top: `${crop.top}%`, 
                      bottom: `${crop.bottom}%`, 
                      width: `${crop.left}%` 
                    }}
                  />
                  <div 
                    className="absolute right-0 bg-black/60 pointer-events-none"
                    style={{ 
                      top: `${crop.top}%`, 
                      bottom: `${crop.bottom}%`, 
                      width: `${crop.right}%` 
                    }}
                  />

                  {/* Selection crop box */}
                  <div 
                    className="absolute border-2 border-emerald-500 border-dashed"
                    style={{
                      left: `${crop.left}%`,
                      right: `${crop.right}%`,
                      top: `${crop.top}%`,
                      bottom: `${crop.bottom}%`,
                    }}
                  >
                    {/* Draggable body (inside box) */}
                    <div 
                      className="absolute inset-0 cursor-move"
                      onMouseDown={(e) => handleBodyDragStart(e)}
                    />

                    {/* Draggable Corner Handles */}
                    {/* Top-Left */}
                    <div 
                      className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize z-40"
                      onMouseDown={(e) => handleCornerDragStart('top-left', e)}
                    />
                    {/* Top-Right */}
                    <div 
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize z-40"
                      onMouseDown={(e) => handleCornerDragStart('top-right', e)}
                    />
                    {/* Bottom-Left */}
                    <div 
                      className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nesw-resize z-40"
                      onMouseDown={(e) => handleCornerDragStart('bottom-left', e)}
                    />
                    {/* Bottom-Right */}
                    <div 
                      className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-emerald-500 rounded-full cursor-nwse-resize z-40"
                      onMouseDown={(e) => handleCornerDragStart('bottom-right', e)}
                    />
                  </div>
                </div>

                {/* Slider Controls for precise adjustments */}
                <div className="w-full space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border/50 max-w-md">
                  <p className="text-xs font-bold text-muted-foreground mb-1 select-none">Recorte Preciso (Controles deslizantes):</p>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-0.5 select-none">
                        <span>Recortar Topo (Cima)</span>
                        <span>{Math.round(crop.top)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="90" value={crop.top}
                        onChange={(e) => handleSliderChange('top', parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-0.5 select-none">
                        <span>Recortar Fundo (Baixo)</span>
                        <span>{Math.round(crop.bottom)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="90" value={crop.bottom}
                        onChange={(e) => handleSliderChange('bottom', parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-0.5 select-none">
                        <span>Recortar Esquerda</span>
                        <span>{Math.round(crop.left)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="90" value={crop.left}
                        onChange={(e) => handleSliderChange('left', parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground mb-0.5 select-none">
                        <span>Recortar Direita</span>
                        <span>{Math.round(crop.right)}%</span>
                      </div>
                      <input 
                        type="range" min="0" max="90" value={crop.right}
                        onChange={(e) => handleSliderChange('right', parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                      />
                    </div>
                  </div>
                </div>
                
                {(crop.top > 0 || crop.bottom > 0 || crop.left > 0 || crop.right > 0) && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 select-none animate-fade-in">
                    <span>Recorte ativo: T:{Math.round(crop.top)}% B:{Math.round(crop.bottom)}% L:{Math.round(crop.left)}% R:{Math.round(crop.right)}%</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={resetCrop}
                      className="h-6 px-2 text-red-500 hover:text-red-400 hover:bg-red-50/10 gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                      Redefinir Recorte
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <div className="flex justify-center gap-4">
          {isAnotherBroadcasterActive ? (
            <div className="text-center space-y-2">
              <Button size="lg" disabled className="gap-2 text-lg px-8 py-6 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed">
                <MonitorUp className="w-6 h-6" />
                Transmissão Indisponível
              </Button>
              <p className="text-xs text-red-500 font-semibold mt-1">
                Outra loja da franquia já está transmitindo no momento.
              </p>
            </div>
          ) : !isBroadcasting ? (
            <Button size="lg" onClick={startScreenShare} className="gap-2 text-lg px-8 py-6 bg-emerald-600 hover:bg-emerald-500 text-white">
              <MonitorUp className="w-6 h-6" />
              Iniciar Compartilhamento
            </Button>
          ) : (
            <Button size="lg" variant="destructive" onClick={stopScreenShare} className="gap-2 text-lg px-8 py-6">
              <MonitorOff className="w-6 h-6" />
              Parar Transmissão
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

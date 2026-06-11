import { useEffect } from 'react';
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

  // Re-bind the stream to the preview video element on mount / state change
  useEffect(() => {
    if (previewVideoRef.current && stream && showPreview) {
      previewVideoRef.current.srcObject = stream;
      previewVideoRef.current.play().catch(e => console.error('Preview play error:', e));
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
                  className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden border border-border shadow-md select-none"
                >
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

import React, { memo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GripVertical, Phone, SkipForward, UserMinus, LogOut, MessageSquare, MapPin, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Entregador } from '@/lib/api';

interface QueueCardProps {
  entregador: Entregador;
  index: number;
  onCall: (e: Entregador) => void;
  onSkip: (e: Entregador) => void;
  onRemove: (e: Entregador) => void;
  onWhatsApp?: (e: Entregador) => void;
  onMap?: (e: Entregador) => void;
  onMoveToDelivery?: (e: Entregador) => void;
  isFirst?: boolean;
}

const QueueCard = memo(({ entregador, index, onCall, onSkip, onRemove, onWhatsApp, onMap, onMoveToDelivery, isFirst }: QueueCardProps) => {
  return (
    <Draggable draggableId={entregador.id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`group bg-card border rounded-xl p-4 mb-3 transition-all hover:shadow-md ${isFirst ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]' : ''}`}
        >
          <div className="flex items-center gap-4">
            <div {...provided.dragHandleProps} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg truncate">
                  {index + 1}. {entregador.nome}
                </h3>
                {entregador.primeiro_checkin && (
                  <Badge variant="outline" className="text-[10px] font-normal py-0">
                    Chegou {new Date(entregador.primeiro_checkin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {entregador.telefone}
                </span>
                {entregador.lat && (
                  <button 
                    onClick={() => onMap?.(entregador)}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    No mapa
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onWhatsApp && !entregador.is_whatsapp_disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => onWhatsApp(entregador)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
              {onMoveToDelivery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 border-dashed text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                  onClick={() => onMoveToDelivery(entregador)}
                  title="Mover para Em Entrega"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Em Entrega
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 border-dashed"
                onClick={() => onSkip(entregador)}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Pular
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onRemove(entregador)}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>

            <Button
              className={`h-11 px-6 font-semibold shadow-sm ${isFirst ? 'animate-pulse' : ''}`}
              onClick={() => onCall(entregador)}
            >
              Chamar
            </Button>
          </div>
        </div>
      )}
    </Draggable>
  );
});

QueueCard.displayName = 'QueueCard';

export default QueueCard;

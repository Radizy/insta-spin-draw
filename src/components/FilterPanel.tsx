import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Filter, Users, MessageSquare, Trophy, UserPlus, ArrowRight } from "lucide-react";
import { Comment } from "@/types/instagram";
import { RaffleFilters, RaffleConfig } from "@/pages/Index";

interface FilterPanelProps {
  post: { id: string; url: string; caption: string };
  comments: Comment[];
  filters: RaffleFilters;
  raffleConfig: RaffleConfig;
  onFiltersChange: (filters: RaffleFilters) => void;
  onConfigChange: (config: RaffleConfig) => void;
  onNext: () => void;
}

const FilterPanel = ({ 
  post, 
  comments, 
  filters, 
  raffleConfig, 
  onFiltersChange, 
  onConfigChange, 
  onNext 
}: FilterPanelProps) => {
  const [previewFiltered, setPreviewFiltered] = useState(false);

  const applyFilters = (allComments: Comment[]): Comment[] => {
    let filtered = [...allComments];

    // Filtro de menções (2+ pessoas)
    if (filters.requireTwoMentions) {
      filtered = filtered.filter(comment => {
        const mentions = (comment.text.match(/@\w+/g) || []).length;
        return mentions >= 2;
      });
    }

    // Filtro de duplicados
    if (!filters.allowDuplicates) {
      const seen = new Set<string>();
      filtered = filtered.filter(comment => {
        const key = `${comment.username}_${comment.text.toLowerCase().trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return filtered;
  };

  const filteredComments = applyFilters(comments);
  const displayComments = previewFiltered ? filteredComments : comments;

  const handleFilterChange = (key: keyof RaffleFilters, value: boolean) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const isValidConfig = raffleConfig.winnersCount > 0 && 
    raffleConfig.winnersCount <= filteredComments.length &&
    raffleConfig.substitutesCount >= 0 &&
    (raffleConfig.winnersCount + raffleConfig.substitutesCount) <= filteredComments.length;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-gradient-secondary shadow-secondary">
          <Filter className="w-8 h-8 text-secondary-foreground" />
        </div>
        <h2 className="text-3xl font-bold">Configure o Sorteio</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Defina os filtros e quantos ganhadores você quer sortear
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Configurações */}
        <div className="space-y-6">
          <Card className="p-6 bg-card/50 border-border/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros de Participação
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Exigir 2+ menções</Label>
                  <p className="text-sm text-muted-foreground">
                    Só participa quem marcar pelo menos 2 pessoas
                  </p>
                </div>
                <Switch
                  checked={filters.requireTwoMentions}
                  onCheckedChange={(checked) => handleFilterChange('requireTwoMentions', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Permitir comentários duplicados</Label>
                  <p className="text-sm text-muted-foreground">
                    Mesma pessoa pode participar várias vezes
                  </p>
                </div>
                <Switch
                  checked={filters.allowDuplicates}
                  onCheckedChange={(checked) => handleFilterChange('allowDuplicates', checked)}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 border-border/50">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Configuração do Sorteio
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="winners">Ganhadores</Label>
                <Input
                  id="winners"
                  type="number"
                  min={1}
                  max={filteredComments.length}
                  value={raffleConfig.winnersCount}
                  onChange={(e) => onConfigChange({
                    ...raffleConfig,
                    winnersCount: parseInt(e.target.value) || 1
                  })}
                  className="text-center h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="substitutes">Suplentes</Label>
                <Input
                  id="substitutes"
                  type="number"
                  min={0}
                  max={filteredComments.length - raffleConfig.winnersCount}
                  value={raffleConfig.substitutesCount}
                  onChange={(e) => onConfigChange({
                    ...raffleConfig,
                    substitutesCount: parseInt(e.target.value) || 0
                  })}
                  className="text-center h-12"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Preview dos comentários */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Comentários Participantes</h3>
            <div className="flex items-center gap-2">
              <Badge variant={previewFiltered ? "default" : "secondary"}>
                {displayComments.length} comentários
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewFiltered(!previewFiltered)}
              >
                {previewFiltered ? "Ver Todos" : "Ver Filtrados"}
              </Button>
            </div>
          </div>

          <Card className="h-96 overflow-hidden bg-card/30 border-border/50">
            <div className="h-full overflow-y-auto p-4 space-y-3">
              {displayComments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors">
                  <img
                    src={comment.user.profile_picture_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40"}
                    alt={comment.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">@{comment.username}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="space-y-1">
              <p className="text-sm font-medium">Resumo do Sorteio</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {filteredComments.length} participantes
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  {raffleConfig.winnersCount} ganhadores
                </span>
                {raffleConfig.substitutesCount > 0 && (
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" />
                    {raffleConfig.substitutesCount} suplentes
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={onNext}
          disabled={!isValidConfig}
          className="h-12 px-8 bg-gradient-accent hover:opacity-90 shadow-primary text-lg gap-2"
        >
          Iniciar Sorteio
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default FilterPanel;
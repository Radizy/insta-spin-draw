import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Share2, RotateCcw, Trophy, Medal, Award } from "lucide-react";
import { Comment } from "@/types/instagram";
import { toast } from "@/hooks/use-toast";

interface ResultsDisplayProps {
  post: { id: string; url: string; caption: string };
  winners: Comment[];
  substitutes: Comment[];
  onNewRaffle: () => void;
}

const ResultsDisplay = ({ post, winners, substitutes, onNewRaffle }: ResultsDisplayProps) => {
  const resultsRef = useRef<HTMLDivElement>(null);

  const downloadResults = async () => {
    // Create a simple text file with results
    const content = `
RESULTADO DO SORTEIO
====================

Data: ${new Date().toLocaleDateString('pt-BR')}
Post: ${post.caption || 'Sorteio Instagram'}

GANHADORES:
${winners.map((w, i) => `${i + 1}. @${w.username}`).join('\n')}

${substitutes.length > 0 ? `SUPLENTES:\n${substitutes.map((s, i) => `${i + 1}. @${s.username}`).join('\n')}` : ''}

Sorteio realizado com Sorteio Insta
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sorteio_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Resultado baixado!",
      description: "Arquivo salvo com sucesso"
    });
  };

  const shareResults = async () => {
    const text = `🎉 RESULTADO DO SORTEIO!\n\nGanhadores:\n${winners.map(w => `🏆 @${w.username}`).join('\n')}\n\nFeito com Sorteio Insta`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Resultado do Sorteio',
          text: text,
          url: post.url
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
        toast({
          title: "Copiado!",
          description: "Resultado copiado para a área de transferência"
        });
      }
    } else {
      navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Resultado copiado para a área de transferência"
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-gradient-primary shadow-primary">
          <Trophy className="w-8 h-8 text-primary-foreground animate-bounce" />
        </div>
        <h2 className="text-3xl font-bold">Sorteio Concluído!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Parabéns aos ganhadores! Confira o resultado abaixo.
        </p>
      </div>

      {/* Results Card */}
      <Card ref={resultsRef} className="p-8 bg-gradient-to-br from-card/80 to-primary/5 border-0 shadow-card">
        <div className="space-y-8">
          {/* Winners Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Trophy className="w-6 h-6 text-warning" />
              <h3 className="text-2xl font-bold">Ganhadores</h3>
              <Trophy className="w-6 h-6 text-warning" />
            </div>
            
            <div className="grid gap-4">
              {winners.map((winner, index) => (
                <Card key={winner.id} className="p-6 bg-gradient-to-r from-warning/10 to-warning/5 border-warning/20 shadow-card animate-bounce-in" style={{ animationDelay: `${index * 0.2}s` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={winner.user.profile_picture_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60"}
                          alt={winner.username}
                          className="w-12 h-12 rounded-full object-cover border-2 border-warning/50"
                        />
                        <div className="absolute -top-1 -right-1 bg-warning text-warning-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-lg">@{winner.username}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {winner.text}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-gradient-accent text-accent-foreground">
                      <Award className="w-3 h-3 mr-1" />
                      Ganhador
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Substitutes Section */}
          {substitutes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Medal className="w-5 h-5 text-accent" />
                <h3 className="text-xl font-bold">Suplentes</h3>
                <Medal className="w-5 h-5 text-accent" />
              </div>
              
              <div className="grid gap-3">
                {substitutes.map((substitute, index) => (
                  <Card key={substitute.id} className="p-4 bg-gradient-to-r from-accent/10 to-accent/5 border-accent/20 shadow-sm animate-bounce-in" style={{ animationDelay: `${(winners.length + index) * 0.2}s` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={substitute.user.profile_picture_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40"}
                            alt={substitute.username}
                            className="w-8 h-8 rounded-full object-cover border border-accent/50"
                          />
                          <div className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                        <div>
                          <h5 className="font-semibold">@{substitute.username}</h5>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {substitute.text}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        <Medal className="w-3 h-3 mr-1" />
                        Suplente
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4">
        <Button
          onClick={downloadResults}
          className="gap-2 bg-gradient-secondary hover:opacity-90 shadow-secondary"
        >
          <Download className="w-4 h-4" />
          Baixar Resultado
        </Button>
        
        <Button
          onClick={shareResults}
          variant="outline"
          className="gap-2"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </Button>
        
        <Button
          onClick={onNewRaffle}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Novo Sorteio
        </Button>
      </div>

      {/* Celebration Animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-4 h-4 animate-confetti opacity-80"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: '-20px',
              background: `linear-gradient(45deg, ${['#ff6b9d', '#c44569', '#f8b500', '#3742fa', '#2ed573'][Math.floor(Math.random() * 5)]}, ${['#ff9ff3', '#f368e0', '#feca57', '#5f27cd', '#00d2d3'][Math.floor(Math.random() * 5)]})`,
              borderRadius: '50%',
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default ResultsDisplay;
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Comment } from "@/types/instagram";
import { RaffleFilters, RaffleConfig } from "@/pages/Index";

interface RaffleRunnerProps {
  post: { id: string; url: string; caption: string };
  comments: Comment[];
  filters: RaffleFilters;
  config: RaffleConfig;
  onComplete: (winners: Comment[], substitutes: Comment[]) => void;
}

const RaffleRunner = ({ comments, filters, config, onComplete }: RaffleRunnerProps) => {
  const [stage, setStage] = useState<'ready' | 'countdown' | 'spinning' | 'complete'>('ready');
  const [countdown, setCountdown] = useState(5);
  const [currentName, setCurrentName] = useState("");
  const [spinSpeed, setSpinSpeed] = useState(50);
  const [selectedWinners, setSelectedWinners] = useState<Comment[]>([]);
  const [selectedSubstitutes, setSelectedSubstitutes] = useState<Comment[]>([]);

  // Aplicar filtros aos comentários
  const applyFilters = (allComments: Comment[]): Comment[] => {
    let filtered = [...allComments];

    if (filters.requireTwoMentions) {
      filtered = filtered.filter(comment => {
        const mentions = (comment.text.match(/@\w+/g) || []).length;
        return mentions >= 2;
      });
    }

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

  const eligibleComments = applyFilters(comments);

  // Countdown timer
  useEffect(() => {
    if (stage === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (stage === 'countdown' && countdown === 0) {
      setStage('spinning');
    }
  }, [stage, countdown]);

  // Name spinning effect
  useEffect(() => {
    if (stage === 'spinning') {
      const interval = setInterval(() => {
        const randomComment = eligibleComments[Math.floor(Math.random() * eligibleComments.length)];
        setCurrentName(randomComment.username);
      }, spinSpeed);

      // Gradually slow down
      const slowDown = setTimeout(() => {
        setSpinSpeed(prev => prev + 20);
      }, 100);

      // Stop spinning after 3 seconds
      const stopSpinning = setTimeout(() => {
        performRaffle();
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(slowDown);
        clearTimeout(stopSpinning);
      };
    }
  }, [stage, spinSpeed, eligibleComments]);

  const performRaffle = () => {
    // Shuffle comments for randomness
    const shuffled = [...eligibleComments].sort(() => Math.random() - 0.5);
    
    const winners = shuffled.slice(0, config.winnersCount);
    const substitutes = shuffled.slice(config.winnersCount, config.winnersCount + config.substitutesCount);
    
    setSelectedWinners(winners);
    setSelectedSubstitutes(substitutes);
    setStage('complete');
    
    // Call parent completion handler
    setTimeout(() => {
      onComplete(winners, substitutes);
    }, 2000);
  };

  const startRaffle = () => {
    setStage('countdown');
    setCountdown(5);
    setSpinSpeed(50);
    setCurrentName("");
    setSelectedWinners([]);
    setSelectedSubstitutes([]);
  };

  const resetRaffle = () => {
    setStage('ready');
    setCountdown(5);
    setCurrentName("");
    setSelectedWinners([]);
    setSelectedSubstitutes([]);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-gradient-accent shadow-glow">
          <Play className="w-8 h-8 text-accent-foreground" />
        </div>
        <h2 className="text-3xl font-bold">Hora do Sorteio!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {eligibleComments.length} pessoas participando • {config.winnersCount} ganhadores • {config.substitutesCount} suplentes
        </p>
      </div>

      {/* Main Raffle Display */}
      <Card className="p-8 text-center bg-gradient-to-br from-card/50 to-primary/5 border-0 shadow-card">
        {stage === 'ready' && (
          <div className="space-y-6">
            <div className="text-6xl">🎯</div>
            <h3 className="text-2xl font-bold">Tudo pronto!</h3>
            <p className="text-muted-foreground">
              Clique no botão abaixo para iniciar o sorteio
            </p>
            <Button 
              onClick={startRaffle}
              className="h-16 px-12 text-xl bg-gradient-primary hover:opacity-90 shadow-primary animate-pulse-glow"
            >
              <Play className="w-6 h-6 mr-3" />
              SORTEAR AGORA!
            </Button>
          </div>
        )}

        {stage === 'countdown' && (
          <div className="space-y-8">
            <div className="text-8xl font-bold text-primary animate-bounce-in">
              {countdown}
            </div>
            <h3 className="text-2xl font-bold">Preparando o sorteio...</h3>
            <Progress value={(5 - countdown) * 20} className="w-64 mx-auto h-2" />
          </div>
        )}

        {stage === 'spinning' && (
          <div className="space-y-8">
            <div className="text-6xl animate-roulette">🎰</div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Sorteando...</h3>
              <div className="text-4xl font-bold text-primary animate-pulse min-h-[48px]">
                @{currentName}
              </div>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        )}

        {stage === 'complete' && selectedWinners.length > 0 && (
          <div className="space-y-8">
            <div className="text-6xl animate-bounce-in">🎉</div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Parabéns aos ganhadores!</h3>
              <div className="space-y-2">
                {selectedWinners.map((winner, index) => (
                  <div key={winner.id} className="text-2xl font-bold text-primary animate-bounce-in" style={{ animationDelay: `${index * 0.2}s` }}>
                    🏆 @{winner.username}
                  </div>
                ))}
              </div>
              {selectedSubstitutes.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-lg font-semibold text-muted-foreground">Suplentes:</h4>
                  {selectedSubstitutes.map((substitute, index) => (
                    <div key={substitute.id} className="text-lg text-accent animate-bounce-in" style={{ animationDelay: `${(selectedWinners.length + index) * 0.2}s` }}>
                      🥉 @{substitute.username}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Controls */}
      {(stage === 'spinning' || stage === 'complete') && (
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            onClick={resetRaffle}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Sortear Novamente
          </Button>
        </div>
      )}

      {/* Background confetti animation */}
      {stage === 'complete' && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                backgroundColor: ['#ff6b9d', '#c44569', '#f8b500', '#3742fa', '#2ed573'][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RaffleRunner;
import { useState, useEffect } from "react";
import { Instagram, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PostSelector from "@/components/PostSelector";
import FilterPanel from "@/components/FilterPanel";
import RaffleRunner from "@/components/RaffleRunner";
import ResultsDisplay from "@/components/ResultsDisplay";
import InstagramLogin from "@/components/InstagramLogin";
import { Comment, InstagramUser } from "@/types/instagram";
import heroImage from "@/assets/hero-raffle.jpg";

export interface RaffleFilters {
  requireTwoMentions: boolean;
  allowDuplicates: boolean;
  minWordsCount?: number;
}

export interface RaffleConfig {
  winnersCount: number;
  substitutesCount: number;
}

const Index = () => {
  const [currentStep, setCurrentStep] = useState<'auth' | 'select' | 'filter' | 'raffle' | 'results'>('auth');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<InstagramUser | null>(null);
  const [selectedPost, setSelectedPost] = useState<{ id: string; url: string; caption: string } | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [filters, setFilters] = useState<RaffleFilters>({
    requireTwoMentions: false,
    allowDuplicates: true
  });
  const [raffleConfig, setRaffleConfig] = useState<RaffleConfig>({
    winnersCount: 1,
    substitutesCount: 0
  });
  const [winners, setWinners] = useState<Comment[]>([]);
  const [substitutes, setSubstitutes] = useState<Comment[]>([]);

  const handleAuthChange = (authenticated: boolean, user?: InstagramUser) => {
    setIsAuthenticated(authenticated);
    setCurrentUser(user || null);
    setCurrentStep(authenticated ? 'select' : 'auth');
  };

  const handlePostSelected = (post: { id: string; url: string; caption: string }, postComments: Comment[]) => {
    setSelectedPost(post);
    setComments(postComments);
    setCurrentStep('filter');
  };

  const handleFiltersReady = () => {
    setCurrentStep('raffle');
  };

  const handleRaffleComplete = (selectedWinners: Comment[], selectedSubstitutes: Comment[]) => {
    setWinners(selectedWinners);
    setSubstitutes(selectedSubstitutes);
    setCurrentStep('results');
  };

  const resetRaffle = () => {
    setCurrentStep('select');
    setSelectedPost(null);
    setComments([]);
    setWinners([]);
    setSubstitutes([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="w-full py-6 px-4 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-primary shadow-primary">
              <Instagram className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Sorteio Insta
            </h1>
          </div>
          
          {(currentStep !== 'auth' && currentStep !== 'select') && (
            <Button variant="outline" onClick={resetRaffle} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Novo Sorteio
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section - Only show on initial screen */}
        {currentStep === 'select' && (
          <div className="text-center mb-12 relative">
            <div className="relative mx-auto max-w-2xl">
              <img 
                src={heroImage} 
                alt="Sorteio Instagram Hero" 
                className="w-full h-48 object-cover rounded-2xl shadow-card opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-2xl"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white drop-shadow-lg">
                  <h2 className="text-4xl font-bold mb-2">Sorteios Divertidos</h2>
                  <p className="text-xl opacity-90">Transforme comentários em prêmios!</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Card className="max-w-4xl mx-auto p-8 shadow-card border-0 bg-card/80 backdrop-blur-sm">
          {currentStep === 'auth' && (
            <InstagramLogin onAuthChange={handleAuthChange} />
          )}
          
          {currentStep === 'select' && isAuthenticated && (
            <PostSelector onPostSelected={handlePostSelected} />
          )}
          
          {currentStep === 'filter' && selectedPost && (
            <FilterPanel
              post={selectedPost}
              comments={comments}
              filters={filters}
              raffleConfig={raffleConfig}
              onFiltersChange={setFilters}
              onConfigChange={setRaffleConfig}
              onNext={handleFiltersReady}
            />
          )}
          
          {currentStep === 'raffle' && selectedPost && (
            <RaffleRunner
              post={selectedPost}
              comments={comments}
              filters={filters}
              config={raffleConfig}
              onComplete={handleRaffleComplete}
            />
          )}
          
          {currentStep === 'results' && selectedPost && (
            <ResultsDisplay
              post={selectedPost}
              winners={winners}
              substitutes={substitutes}
              onNewRaffle={resetRaffle}
            />
          )}
        </Card>
      </main>

      {/* Floating particles animation */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary/20 rounded-full animate-float"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + i * 10}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Index;
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Instagram, LogOut, User, CheckCircle, Loader2 } from "lucide-react";
import { instagramAuth } from "@/lib/instagram-auth";
import { realInstagramApi } from "@/lib/instagram-api";
import { InstagramUser } from "@/types/instagram";
import { USE_MOCK_API } from "@/lib/env";
import { toast } from "@/hooks/use-toast";

interface InstagramLoginProps {
  onAuthChange: (isAuthenticated: boolean, user?: InstagramUser) => void;
}

const InstagramLogin = ({ onAuthChange }: InstagramLoginProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<InstagramUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
    
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code) {
      handleOAuthCallback(code);
    } else if (error) {
      toast({
        title: "Erro na autenticação",
        description: "Falha ao conectar com Instagram. Tente novamente.",
        variant: "destructive"
      });
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      // In development mode, auto-authenticate for demo
      if (USE_MOCK_API) {
        const mockUser = await realInstagramApi.getUserProfile();
        setUser(mockUser);
        setIsAuthenticated(true);
        onAuthChange(true, mockUser);
        setLoading(false);
        return;
      }

      const authenticated = instagramAuth.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await instagramAuth.refreshTokenIfNeeded();
        const userProfile = await realInstagramApi.getUserProfile();
        setUser(userProfile);
        onAuthChange(true, userProfile);
      } else {
        onAuthChange(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      instagramAuth.clearToken();
      setIsAuthenticated(false);
      onAuthChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setLoginLoading(true);
    try {
      await instagramAuth.exchangeCodeForToken(code);
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      await checkAuthStatus();
      
      toast({
        title: "Conectado com sucesso!",
        description: "Sua conta Instagram foi conectada."
      });
    } catch (error) {
      console.error('OAuth callback failed:', error);
      toast({
        title: "Erro na autenticação",
        description: "Falha ao processar login do Instagram.",
        variant: "destructive"
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogin = () => {
    setLoginLoading(true);
    const authUrl = instagramAuth.getAuthUrl();
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    instagramAuth.clearToken();
    setIsAuthenticated(false);
    setUser(null);
    onAuthChange(false);
    
    toast({
      title: "Desconectado",
      description: "Sua conta Instagram foi desconectada."
    });
  };

  if (loading || loginLoading) {
    return (
      <Card className="p-8 text-center bg-card/50 border-border/50">
        <div className="space-y-4">
          <div className="inline-flex p-4 rounded-full bg-gradient-primary shadow-primary">
            <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
          </div>
          <h3 className="text-xl font-semibold">
            {loginLoading ? "Conectando com Instagram..." : "Verificando autenticação..."}
          </h3>
          <p className="text-muted-foreground">
            {loginLoading ? "Aguarde enquanto processamos seu login" : "Por favor, aguarde"}
          </p>
        </div>
      </Card>
    );
  }

  if (isAuthenticated && user) {
    return (
      <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user.profile_picture_url || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60"}
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-success/50"
              />
              <CheckCircle className="absolute -bottom-1 -right-1 w-5 h-5 text-success bg-background rounded-full" />
            </div>
            <div>
              <h4 className="font-semibold text-success-foreground">@{user.username}</h4>
              <p className="text-sm text-muted-foreground">Conectado ao Instagram</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Instagram className="h-4 w-4" />
        <AlertDescription>
          Para acessar os comentários reais do Instagram, você precisa conectar sua conta.
        </AlertDescription>
      </Alert>

      <Card className="p-8 text-center bg-card/50 border-border/50">
        <div className="space-y-6">
          <div className="inline-flex p-4 rounded-full bg-gradient-primary shadow-primary">
            <Instagram className="w-8 h-8 text-primary-foreground" />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-bold">Conecte sua conta</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Faça login com Instagram para acessar seus posts e comentários reais para o sorteio
            </p>
          </div>

          <Button
            onClick={handleLogin}
            className="h-12 px-8 text-lg bg-gradient-primary hover:opacity-90 shadow-primary gap-3"
          >
            <Instagram className="w-5 h-5" />
            Conectar com Instagram
          </Button>

          <div className="text-xs text-muted-foreground max-w-sm mx-auto">
            Seus dados estão seguros. Usamos apenas as permissões necessárias para acessar posts e comentários.
          </div>
        </div>
      </Card>
    </div>
  );
};

export default InstagramLogin;
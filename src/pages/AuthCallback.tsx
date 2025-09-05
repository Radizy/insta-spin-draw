import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Loader2, Instagram } from "lucide-react";
import { instagramAuth } from "@/lib/instagram-auth";
import { toast } from "@/hooks/use-toast";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        toast({
          title: "Erro na autenticação",
          description: errorDescription || "Falha ao conectar com Instagram",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (!code) {
        toast({
          title: "Código não encontrado",
          description: "Erro no processo de autenticação",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        await instagramAuth.exchangeCodeForToken(code);
        toast({
          title: "Sucesso!",
          description: "Conta Instagram conectada com sucesso"
        });
        navigate('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          title: "Erro na autenticação",
          description: "Falha ao processar o login do Instagram",
          variant: "destructive"
        });
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="p-8 text-center max-w-md">
        <div className="space-y-4">
          <div className="inline-flex p-4 rounded-full bg-gradient-primary shadow-primary">
            <Instagram className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Processando autenticação</h2>
          <p className="text-muted-foreground">
            Aguarde enquanto conectamos sua conta do Instagram...
          </p>
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AuthCallback;
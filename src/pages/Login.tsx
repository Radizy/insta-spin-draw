import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pizza, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    
    try {
      const loggedUser = await login(username, password);
      
      if (loggedUser) {
        toast.success('Login realizado com sucesso!');
        navigate(loggedUser.role === 'super_admin' ? '/admin' : '/roteirista');
      } else {
        toast.error('Usuário ou senha incorretos');
      }
    } catch (error) {
      toast.error('Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Elementos de background glassmorphism */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-emerald-500 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-primary/20">
            <Pizza className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight font-mono mb-2 text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">FilaLab</h1>
          <p className="text-muted-foreground text-lg">Acesso protegido</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-xl rounded-[2rem] p-8 space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-foreground/80">Usuário</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Digite seu usuário"
                autoComplete="username"
                className="bg-background/50 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground/80">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                className="bg-background/50 border-border/50 h-12 rounded-xl focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <Button type="submit" className="w-full h-12 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all hover:scale-[1.02]" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Acessar Sistema
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-semibold">Ou</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl border-border/50 hover:bg-muted/50 transition-all font-semibold"
              onClick={() => navigate('/register')}
            >
              Criar nova conta • 7 dias grátis
            </Button>
          </div>
        </form>

        <p className="text-center text-sm font-medium text-muted-foreground mt-8">
          FilaLab • Sistema inteligente de gestão
        </p>
      </div>
    </div>
  );
}

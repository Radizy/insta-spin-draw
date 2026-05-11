import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Pizza, Loader2, ArrowLeft, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Plan {
  id: string;
  nome: string;
  descricao: string | null;
  preco_total: number;
  valor_base: number;
  plano_id: string | null;
}

// Definir módulos de cada plano
const PLAN_MODULES = {
  'Pacote Básico': [
    '✓ Gestão de fila de entregadores',
    '✓ Controle de check-in/check-out',
    '✓ Tela de TV básica',
    '✓ Sistema de senhas de pagamento',
    '✓ Histórico de entregas',
    '✓ 1 loja incluída'
  ],
  'Pacote Planilha + WhatsApp': [
    '✓ Tudo do Básico',
    '✓ Integração com Google Sheets',
    '✓ WhatsApp Avançado com templates',
    '✓ Notificações automáticas',
    '✓ Até 3 lojas'
  ],
  'Pacote Completo': [
    '✓ Tudo dos planos anteriores',
    '✓ TV Premium com animações',
    '✓ Relatórios avançados',
    '✓ Suporte prioritário',
    '✓ Lojas ilimitadas',
    '✓ Customizações exclusivas'
  ]
};

export default function Register() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  const [formData, setFormData] = useState({
    nomeEmpresa: '',
    cpfCnpj: '',
    email: '',
    telefone: '',
    nomeFranquia: '',
    nomeLoja: '',
    planoId: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  // Buscar planos disponíveis (pacotes comerciais vinculados a planos)
  useState(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('pacotes_comerciais')
        .select('id, nome, descricao, preco_total, plano_id, ativo')
        .eq('ativo', true)
        .order('preco_total', { ascending: true });

      if (error) {
        toast.error('Erro ao carregar planos');
        console.error('Error fetching plans:', error);
      } else {
        const pacotes = (data || []) as { id: string; nome: string; descricao: string | null; preco_total: number; plano_id: string | null }[];
        setPlans(pacotes.map((p) => ({ ...p, valor_base: p.preco_total })));
      }
      setLoadingPlans(false);
    };

    fetchPlans();
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPlanModules = (planName: string): string[] => {
    return PLAN_MODULES[planName as keyof typeof PLAN_MODULES] || [];
  };

  const validateForm = () => {
    if (!formData.nomeEmpresa.trim()) {
      toast.error('Nome da empresa é obrigatório');
      return false;
    }
    if (!formData.cpfCnpj.trim()) {
      toast.error('CPF/CNPJ é obrigatório');
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error('Email válido é obrigatório');
      return false;
    }
    if (!formData.telefone.trim()) {
      toast.error('Telefone é obrigatório');
      return false;
    }
    if (!formData.nomeFranquia.trim()) {
      toast.error('Nome da franquia é obrigatório');
      return false;
    }
    if (!formData.nomeLoja.trim()) {
      toast.error('Nome da loja é obrigatório');
      return false;
    }
    if (!formData.planoId) {
      toast.error('Selecione um plano');
      return false;
    }
    if (!formData.username.trim() || formData.username.length < 3) {
      toast.error('Usuário deve ter pelo menos 3 caracteres');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('register-franchise', {
        body: {
          nomeEmpresa: formData.nomeEmpresa,
          cpfCnpj: formData.cpfCnpj,
          email: formData.email,
          telefone: formData.telefone,
          nomeFranquia: formData.nomeFranquia,
          nomeLoja: formData.nomeLoja,
          pacoteId: formData.planoId,
          username: formData.username,
          password: formData.password,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
        navigate('/login');
      } else {
        toast.error(data?.error || 'Erro ao realizar cadastro');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Erro ao realizar cadastro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10 py-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-emerald-500 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-primary/20">
            <Pizza className="w-10 h-10 text-white drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight font-mono mb-2 text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">FilaLab</h1>
          <p className="text-muted-foreground text-lg">Crie sua conta e ganhe 7 dias grátis</p>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 shadow-2xl rounded-[2rem] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="p-8 border-b border-border/50 bg-muted/20 relative z-10">
            <h2 className="text-2xl font-bold font-mono">Nova Conta</h2>
            <p className="text-muted-foreground mt-1">
              Preencha seus dados comerciais para configurar o FilaLab.
            </p>
          </div>
          <div className="p-8 relative z-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="nomeEmpresa" className="font-semibold text-foreground/80">Nome da Empresa</Label>
                  <Input
                    id="nomeEmpresa"
                    value={formData.nomeEmpresa}
                    onChange={(e) => handleChange('nomeEmpresa', e.target.value)}
                    placeholder="Ex: Pizzaria Dom João"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj" className="font-semibold text-foreground/80">CPF ou CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => handleChange('cpfCnpj', e.target.value)}
                    placeholder="000.000.000-00"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-semibold text-foreground/80">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="contato@empresa.com"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="font-semibold text-foreground/80">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => handleChange('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomeFranquia" className="font-semibold text-foreground/80">Nome da Franquia</Label>
                  <Input
                    id="nomeFranquia"
                    value={formData.nomeFranquia}
                    onChange={(e) => handleChange('nomeFranquia', e.target.value)}
                    placeholder="Ex: Pizzaria SP"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomeLoja" className="font-semibold text-foreground/80">Nome da Loja</Label>
                  <Input
                    id="nomeLoja"
                    value={formData.nomeLoja}
                    onChange={(e) => handleChange('nomeLoja', e.target.value)}
                    placeholder="Ex: Loja Centro"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="font-semibold text-foreground/80">Usuário de acesso</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    placeholder="usuario"
                    autoComplete="username"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-semibold text-foreground/80">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="confirmPassword" className="font-semibold text-foreground/80">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="••••••"
                    autoComplete="new-password"
                    className="bg-background/50 h-12 rounded-xl focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <Label className="text-lg font-bold">Escolha seu plano</Label>
                {loadingPlans ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <RadioGroup value={formData.planoId} onValueChange={(value) => handleChange('planoId', value)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map((plan) => {
                      const modules = getPlanModules(plan.nome);
                      const isSelected = formData.planoId === plan.id;
                      return (
                        <div key={plan.id} className={`relative flex items-start space-x-3 border-2 rounded-2xl p-5 transition-all cursor-pointer ${isSelected ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'}`} onClick={() => handleChange('planoId', plan.id)}>
                          <RadioGroupItem value={plan.id} id={plan.id} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={plan.id} className="font-bold text-lg cursor-pointer">
                                {plan.nome}
                              </Label>
                            </div>
                            <p className="text-sm font-extrabold text-primary mt-1 bg-primary/10 inline-block px-2 py-1 rounded-md">
                              {formatCurrency(plan.valor_base)}/mês
                            </p>
                            <div className="text-xs text-muted-foreground mt-3 space-y-1">
                              {modules.slice(0, 4).map((module, idx) => (
                                <p key={idx} className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-primary/50" /> {module}</p>
                              ))}
                              {modules.length > 4 && (
                                <p className="text-primary font-bold mt-1 text-[10px] uppercase tracking-wider">+ {modules.length - 4} recursos inclusos</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </RadioGroup>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 text-sm text-foreground/80 shadow-inner">
                <p className="font-bold text-amber-500 mb-2 flex items-center gap-2">
                  <span className="text-lg">⏳</span> Informações sobre o Trial:
                </p>
                <ul className="space-y-1 list-disc list-inside ml-1">
                  <li><strong>7 dias</strong> de acesso total gratuito ao sistema.</li>
                  <li>Liberado todos os recursos do plano que você escolher.</li>
                  <li>Após 7 dias, a assinatura iniciará e boletos serão gerados.</li>
                  <li><strong className="text-destructive font-semibold">Sem pagamento:</strong> os dados expiram após 14 dias de inadimplência.</li>
                </ul>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="flex-1 h-14 rounded-xl font-bold border-border/50 hover:bg-muted/50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-[2] h-14 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                  {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                  Finalizar Cadastro
                </Button>
              </div>
            </form>
          </div>
        </div>

        <p className="text-center text-sm font-medium text-muted-foreground mt-8">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline">
            Faça login aqui
          </Link>
        </p>
      </div>
    </div>
  );
}

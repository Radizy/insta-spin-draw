import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Pizza,
  Zap,
  MonitorPlay,
  MessageSquare,
  FileSpreadsheet,
  Wallet,
  Menu,
  X,
  Facebook,
  Instagram,
  Mail,
  ArrowRight,
  CreditCard,
  Server,
  SmartphoneNfc,
  Phone,
  AudioLines,
  Link2,
  TableProperties
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TermosDeUsoModal } from '@/components/TermosDeUsoModal';
import { PoliticaDePrivacidadeModal } from '@/components/PoliticaDePrivacidadeModal';
import { LandingMockup } from '@/components/landing/LandingMockup';
import { ModuleLiveMockup } from '@/components/landing/ModuleLiveMockups';

export default function Index() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const modulesData = [
    {
      id: 'whatsapp',
      title: 'WhatsApp Avançado',
      icon: MessageSquare,
      color: 'text-green-500',
      bgPrefix: 'bg-green-500/10',
      borderPrefix: 'border-green-500/20',
      shortDesc: 'Avisos da evolução das rotas direto no celular.',
      longDesc: 'O módulo de WhatsApp Avançado transforma a comunicação da sua operação. Através da integração direta com a Evolution API, o sistema dispara notificações automaticamente.\n\nBenefícios:\n• Retorno instantâneo no celular do entregador.\n• Reduz a desorganização visual nos caixas de espera.\n• Histórico arquivado das despachadas diárias.'
    },
    {
      id: 'tv',
      title: 'TV Premium (TTS)',
      icon: MonitorPlay,
      color: 'text-blue-500',
      bgPrefix: 'bg-blue-500/10',
      borderPrefix: 'border-blue-500/20',
      shortDesc: 'Anúncios vocais ultra-realistas com rediscagem.',
      longDesc: 'O ápice visual e sonoro da plataforma. Usando as integrações locais e a inteligência da ElevenLabs, geramos chamadas sintetizadas para cada comanda em tela grande.\n\nBenefícios:\n• Motoboy ouve o som nítido do nome e qual bag recolher.\n• Playlist Ociosa: insira mídia programática (Vídeos ou Clima) rodando no fundo da loja.\n• Função Rediscagem Inteligente que repete se a moto atrasar.'
    },
    {
      id: 'sheets',
      title: 'Integração Planilha',
      icon: FileSpreadsheet,
      color: 'text-emerald-500',
      bgPrefix: 'bg-emerald-500/10',
      borderPrefix: 'border-emerald-500/20',
      shortDesc: 'Relatório financeiro automático direto via Webhook.',
      longDesc: 'Adeus lançamentos em cadernos! Alimente suas próprias planilhas de forma invisível. O sistema dispara os Webhooks a cada encerramento e cash-out concluído.\n\nBenefícios:\n• Fechamento e espelhos financeiras geradas em tempo real na nuvem.\n• Abas nativas dinâmicas processando saídas e retornos.'
    },
    {
      id: 'pagamento',
      title: 'Fila de Pagamentos',
      icon: Wallet,
      color: 'text-amber-500',
      bgPrefix: 'bg-amber-500/10',
      borderPrefix: 'border-amber-500/20',
      shortDesc: 'Senhas eletrônicas robustas estruturando acertos de turno.',
      longDesc: 'O encerramento do expediente e cálculo de diárias nunca foi tão fácil. Motoboys tiram a senha eletrônica via totem ou App FilaLab, visualizando a próxima da fila.\n\nBenefícios:\n• O despachante aprova e liquida de forma linear.\n• Evita amontoamentos próximos ao dinheiro vivo nas bases e matriz.'
    },
    {
      id: 'maquininhas',
      title: 'Controle de Maquininhas',
      icon: SmartphoneNfc,
      color: 'text-cyan-500',
      bgPrefix: 'bg-cyan-500/10',
      borderPrefix: 'border-cyan-500/20',
      shortDesc: 'Gestão visual da frota de terminais de pagamento (POS).',
      longDesc: 'Central de ativos da sua operação logística focado em monitoramento fiscal. Saiba exatamente qual motociclista portava cada terminal durante o turno específico.\n\nBenefícios:\n• Controle total de comodato (Entregador <> POS de crédito).\n• Alerta instantâneo caso os terminais voltem descarregados.\n• Vinculação limpa junto ao roteirista.'
    },
    {
      id: 'sisfood',
      title: 'Integração SISFOOD',
      icon: Server,
      color: 'text-rose-500',
      bgPrefix: 'bg-rose-500/10',
      borderPrefix: 'border-rose-500/20',
      shortDesc: 'Scripts de importação blindando o delay do PDV.',
      longDesc: 'Se você usa o Sisfood nos caixas, essa ponte (Webhook-Bridge Script) repassa automaticamente cada alteração vital para as telas do Roteirista e FilaLab.\n\nBenefícios:\n• Rastreia em que momento cada cupom foi impresso lá no Caixa.\n• Captura tempos de expiração protegendo os indicadores contra atrasos fantasma.\n• Versão Anti-Zumbi já estabilizada mantendo duplo sinal imune à intermitência.'
    }
  ];

  const whatsappNumber = "5511954545985";
  const whatsappMessage = encodeURIComponent("Olá! Gostaria de saber mais sobre o sistema FilaLab.");
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/30">
      {/* Navbar com Glassmorphism melhorado */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled ? 'bg-background/60 xl:bg-background/40 backdrop-blur-xl border-b border-border shadow-sm' : 'bg-transparent'
          }`}
      >
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
              <Pizza className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold font-mono tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">FilaLab</span>
          </div>

          <div className="hidden md:flex items-center gap-8 bg-card/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/5">
            <button onClick={() => scrollToSection('home')} className="text-sm font-medium hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection('como-funciona')} className="text-sm font-medium hover:text-primary transition-colors">Como Funciona</button>
            <button onClick={() => scrollToSection('modulos')} className="text-sm font-medium hover:text-primary transition-colors">Módulos</button>
            <button onClick={() => scrollToSection('contato')} className="text-sm font-medium hover:text-primary transition-colors">Contato</button>
            <Link to="/meu-lugar" className="text-sm font-medium transition-colors text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              Sou Motoboy
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" className="font-medium hover:bg-white/5" onClick={() => navigate('/login')}>
              Login
            </Button>
            <Button className="font-medium rounded-full px-6 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-lg shadow-primary/20 border-0" onClick={() => window.location.href = 'https://filalab.com.br/register'}>
              Assinar Agora
            </Button>
          </div>

          <button className="md:hidden p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-md z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <div className={`md:hidden fixed top-0 right-0 w-[85%] max-w-sm h-full bg-background/95 backdrop-blur-xl border-l border-white/10 z-50 shadow-2xl transition-transform duration-500 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-primary to-emerald-400 rounded-lg flex justify-center items-center"><Pizza className="w-4 h-4 text-white" /></div>
              <span className="text-xl font-bold font-mono tracking-tight">FilaLab</span>
            </div>
            <button className="p-2 bg-secondary/50 rounded-full" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col p-6 overflow-y-auto flex-1 gap-2">
            <button onClick={() => scrollToSection('home')} className="text-left text-lg font-medium p-3 rounded-xl hover:bg-secondary/50 transition-colors">Home</button>
            <button onClick={() => scrollToSection('como-funciona')} className="text-left text-lg font-medium p-3 rounded-xl hover:bg-secondary/50 transition-colors">Como Funciona</button>
            <button onClick={() => scrollToSection('modulos')} className="text-left text-lg font-medium p-3 rounded-xl hover:bg-secondary/50 transition-colors">Módulos</button>
            <button onClick={() => scrollToSection('contato')} className="text-left text-lg font-medium p-3 rounded-xl hover:bg-secondary/50 transition-colors">Contato</button>
            <Link to="/meu-lugar" onClick={() => setMobileMenuOpen(false)} className="text-left text-lg font-medium p-3 rounded-xl text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors mt-2">Área do Motoboy</Link>
          </div>
          <div className="p-6 border-t border-border/50 bg-black/20 flex flex-col gap-3">
            <Button variant="outline" className="w-full justify-center h-12 text-base rounded-xl border-white/10 bg-white/5" onClick={() => navigate('/login')}>
              Login do Sistema
            </Button>
            <Button className="w-full justify-center h-12 text-base rounded-xl bg-gradient-to-r from-primary to-emerald-500 text-white border-0" onClick={() => window.location.href = 'https://filalab.com.br/register'}>
              Começar Agora
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section Premium */}
      <section id="home" className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-4 relative flex min-h-[90vh] items-center">
        {/* Animated Background Blobs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-primary/30 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob pointer-events-none"></div>
        <div className="absolute top-40 -right-20 w-96 h-96 bg-emerald-500/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob pointer-events-none" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-20 left-1/2 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-[100px] opacity-60 animate-blob pointer-events-none" style={{ animationDelay: '4s' }}></div>

        <div className="container relative z-10 mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Esquerda: Conteúdo & CTA */}
            <div className="space-y-8 lg:pr-8 text-center lg:text-left animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-white/10 shadow-lg text-sm font-medium mb-2 transform hover:scale-105 transition-transform cursor-default">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Otimize 100% da sua expedição
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-balance leading-[1.1]">
                Gestão genial de <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-emerald-400 animate-pulse">
                  filas e entregas
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 text-balance leading-relaxed">
                Centralize roteirização, painéis de TV com chamadas por IA, notificação instantânea pelo WhatsApp, gestão de maquininhas e repasses em uma plataforma hiper-rápida.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Button size="lg" className="w-full sm:w-auto rounded-full px-8 text-base h-14 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 shadow-[0_0_30px_rgba(16,185,129,0.3)] border-0" onClick={() => window.location.href = 'https://filalab.com.br/register'}>
                  Iniciar Teste Grátis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-8 text-base h-14 bg-card/30 backdrop-blur-md border-white/10 hover:bg-card/60" onClick={() => scrollToSection('como-funciona')}>
                  Saber como funciona
                </Button>
              </div>
            </div>

            {/* Direita: Mockup Virtual Live */}
            <div className="w-full max-w-[600px] mx-auto hidden lg:block animate-in fade-in slide-in-from-right-10 duration-1000 delay-300">
               <LandingMockup />
            </div>

          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none"></div>
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Adeus ao Caos Logístico</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Desde o preparo da bag até o motoboy sair para a entrega. Cada engrenagem roda com perfeição.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-xl hover:shadow-primary/20 transition-all duration-300 group hover:-translate-y-2 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors"></div>
              <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 text-primary rounded-2xl flex items-center justify-center mb-6 border border-primary/20">
                <MonitorPlay className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground/90">Organização Visual</h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                O despachante utiliza o painel inteligente enquanto a TV informa automaticamente o motoboy através de alertas sonoros sintéticos.
              </p>
            </div>

            <div className="bg-card/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 group hover:-translate-y-2 relative overflow-hidden md:mt-10">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl group-hover:bg-emerald-500/30 transition-colors"></div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground/90">Avisos Instantâneos</h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                Fim dos gritos: o entregador recebe chamadas automáticas em seu próprio WhatsApp no exato momento que sua comanda empacota.
              </p>
            </div>

            <div className="bg-card/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-xl hover:shadow-amber-500/20 transition-all duration-300 group hover:-translate-y-2 relative overflow-hidden md:mt-20">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl group-hover:bg-amber-500/30 transition-colors"></div>
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-500/5 text-amber-500 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20">
                <Wallet className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground/90">Acertos sem Falhas</h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                Gere senhas de pagamento no fechamento e exporte planilhas financeiras das diárias automaticamente pelo Webhook Google Sheets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modulos Section */}
      <section id="modulos" className="py-24 relative">
        <div className="container mx-auto px-4 max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex px-3 py-1 rounded-full bg-secondary text-sm font-medium mb-2 border border-border">Core Features</div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Módulos Exclusivos</h2>
              <p className="text-muted-foreground text-lg">
                Seu sistema amadurece e escala com o seu fluxo. Ative na hora os poderes que mais agregam velocidade ao seu delivery.
              </p>
            </div>
            <Button variant="outline" className="rounded-full bg-card/50 backdrop-blur-md border-white/10 h-12 px-6" onClick={() => window.open(whatsappLink, '_blank')}>
              Ver Módulos & Preços
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulesData.map((mod) => (
              <div
                key={mod.id}
                onClick={() => setSelectedModule(mod)}
                className="bg-card/50 backdrop-blur-lg p-8 rounded-3xl border border-white/5 hover:border-primary/30 transition-all duration-300 cursor-pointer group hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden flex flex-col"
              >
                <div className="absolute bottom-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
                  <mod.icon className={`w-32 h-32 ${mod.color}`} />
                </div>
                
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${mod.bgPrefix} border ${mod.borderPrefix} shadow-inner`}>
                  <mod.icon className={`w-8 h-8 ${mod.color}`} />
                </div>
                <h4 className="text-2xl font-bold mb-3">{mod.title}</h4>
                <p className="text-base text-muted-foreground mb-6 leading-relaxed flex-1">{mod.shortDesc}</p>
                <div className={`flex items-center text-sm font-bold ${mod.color} group-hover:underline underline-offset-4 decoration-2`}>
                  Sobre o Módulo <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner CTA Final Glass */}
      <section className="py-24 relative px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 md:p-20 text-center relative overflow-hidden shadow-2xl">
            {/* Super Glow Effects */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/40 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/30 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">Acelere sua Frota.</h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium">
                Junte-se a dezenas de franquias top performer abandonando planilhas furadas para um hub moderno de gestão.
              </p>
              <div className="pt-8">
                <Button size="lg" className="rounded-full px-12 h-16 text-lg tracking-wide font-bold bg-white text-black hover:bg-slate-200 shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all transform hover:scale-105" onClick={() => window.open(whatsappLink, '_blank')}>
                  Falar com um Consultor
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dialog Modificada com as Animações Avançadas e Mockups Live */}
      <Dialog open={!!selectedModule} onOpenChange={(open: boolean) => !open && setSelectedModule(null)}>
        <DialogContent className="sm:max-w-3xl border-white/10 bg-background/80 backdrop-blur-3xl p-0 overflow-hidden rounded-[2rem]">
          {selectedModule && (
            <>
              {/* Box da Animação Mockup */}
              <div className={`h-[350px] sm:h-[450px] w-full ${selectedModule.bgPrefix} relative flex items-center justify-center overflow-hidden border-b border-white/5`}>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 dark:to-background/90 pointer-events-none z-10"></div>
                
                <div className="absolute inset-0 flex items-center justify-center p-4 z-0">
                  <ModuleLiveMockup id={selectedModule.id} />
                </div>
              </div>
              
              <div className="p-8 pb-4 relative z-20 -mt-10">
                <DialogTitle className="text-3xl font-bold tracking-tight mb-2 text-foreground/90 text-center">{selectedModule.title}</DialogTitle>
                <DialogDescription className="text-lg text-muted-foreground text-center">
                  Demonstração Estratégica
                </DialogDescription>
              </div>
              <div className="px-8 py-2 text-muted-foreground whitespace-pre-line leading-relaxed text-base relative z-20">
                {selectedModule.longDesc}
              </div>
              <div className="p-8 pt-6 flex flex-col sm:flex-row gap-4 relative z-20 mt-4 bg-black/20 border-t border-white/5">
                <Button variant="outline" onClick={() => setSelectedModule(null)} className="w-full sm:w-auto h-14 rounded-xl border-white/10 bg-transparent hover:bg-white/5">
                  Fechar
                </Button>
                <Button onClick={() => window.open(whatsappLink, '_blank')} className={`w-full h-14 rounded-xl text-base font-bold shadow-lg shadow-black/20`} style={{ backgroundColor: 'hsl(var(--primary))'}}>
                  Solicitar Integração <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer id="contato" className="border-t border-white/5 bg-background/50 backdrop-blur-lg pt-20 pb-10">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center border border-primary/30">
                  <Pizza className="w-5 h-5" />
                </div>
                <span className="text-2xl font-bold font-mono tracking-tight text-foreground/80">FilaLab</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                O ecossistema definitivo para gerenciar centenas de entregadores, filas sonoras em TV e integração autônoma de dados (Sisfood & Maquininhas).
              </p>
            </div>

            <div className="space-y-6">
              <h4 className="font-semibold text-lg text-foreground/90 tracking-wide">Produto</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><button onClick={() => scrollToSection('home')} className="hover:text-primary transition-colors">Início</button></li>
                <li><button onClick={() => scrollToSection('como-funciona')} className="hover:text-primary transition-colors">Arquitetura</button></li>
                <li><button onClick={() => scrollToSection('modulos')} className="hover:text-primary transition-colors">Módulos</button></li>
                <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-emerald-400 font-medium transition-colors" onClick={() => navigate('/login')}>Painel do Lojista</Button></li>
              </ul>
            </div>

            <div className="space-y-6">
              <h4 className="font-semibold text-lg text-foreground/90 tracking-wide">Ajuda</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex items-center gap-3 bg-secondary/30 p-2 rounded-lg border border-border">
                  <Phone className="w-4 h-4 text-emerald-400" /> (11) 95454-5985
                </li>
                <li className="flex items-center gap-3 p-2">
                  <Mail className="w-4 h-4 text-primary" /> contato@filalab.com.br
                </li>
              </ul>
              <div className="flex gap-3 pt-2">
                <a href="#" className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-primary/20 hover:text-primary hover:border-primary/50 transition-all">
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground font-medium">
            <p className="bg-card px-4 py-2 rounded-full border border-border">© {new Date().getFullYear()} FilaLab. Software Logístico.</p>
            <div className="flex gap-6">
              <button onClick={() => setIsTermsOpen(true)} className="hover:text-primary transition-colors">Termos de Uso</button>
              <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-primary transition-colors">Política de Retenção</button>
            </div>
          </div>
        </div>
      </footer>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 z-50 right-6 w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 hover:to-green-500 text-white rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-transform hover:scale-110 hover:-translate-y-1 animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <MessageSquare className="w-6 h-6" />
      </a>

      <TermosDeUsoModal open={isTermsOpen} onOpenChange={setIsTermsOpen} />
      <PoliticaDePrivacidadeModal open={isPrivacyOpen} onOpenChange={setIsPrivacyOpen} />
    </div>
  );
}
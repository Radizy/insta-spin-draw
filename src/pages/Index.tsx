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
  CheckCircle2,
  Phone
} from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // TODO: Edite o número do WhatsApp e mensagem padrão aqui
  const whatsappNumber = "5511999999999";
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
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      {/* Navbar */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-background/80 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent'
          }`}
      >
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Pizza className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-mono tracking-tight">FilaLab</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('home')} className="text-sm font-medium hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection('como-funciona')} className="text-sm font-medium hover:text-primary transition-colors">Como Funciona</button>
            <button onClick={() => scrollToSection('modulos')} className="text-sm font-medium hover:text-primary transition-colors">Módulos</button>
            <button onClick={() => scrollToSection('contato')} className="text-sm font-medium hover:text-primary transition-colors">Contato</button>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" className="font-medium" onClick={() => navigate('/login')}>
              Fazer Login
            </Button>
            <Button className="font-medium rounded-full px-6" onClick={() => window.open(whatsappLink, '_blank')}>
              Assinar Agora
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden p-2 text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-background border-b border-border shadow-lg py-4 flex flex-col gap-4 px-6 animate-in slide-in-from-top-2">
            <button onClick={() => scrollToSection('home')} className="text-left text-lg font-medium py-2 border-b border-border/50">Home</button>
            <button onClick={() => scrollToSection('como-funciona')} className="text-left text-lg font-medium py-2 border-b border-border/50">Como Funciona</button>
            <button onClick={() => scrollToSection('modulos')} className="text-left text-lg font-medium py-2 border-b border-border/50">Módulos</button>
            <button onClick={() => scrollToSection('contato')} className="text-left text-lg font-medium py-2 border-b border-border/50">Contato</button>
            <div className="flex flex-col gap-2 pt-2">
              <Button variant="outline" className="w-full justify-center" onClick={() => navigate('/login')}>
                Fazer Login
              </Button>
              <Button className="w-full justify-center" onClick={() => window.open(whatsappLink, '_blank')}>
                Assinar Agora
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 md:pt-40 md:pb-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>
        <div className="container relative z-10 mx-auto max-w-5xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium mb-4">
            <Zap className="w-4 h-4" /> Otimize 100% da sua expedição
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance leading-tight">
            Gestão inteligente de <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
              filas e entregas
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Centralize roteirização, painéis de TV de chamada, comunicação com entregadores via WhatsApp e gestão de repasses financeiros em uma única plataforma robusta.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="rounded-full px-8 text-base h-14" onClick={() => window.open(whatsappLink, '_blank')}>
              Iniciar Teste Grátis <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8 text-base h-14 bg-background/50 backdrop-blur-sm" onClick={() => scrollToSection('como-funciona')}>
              Saber como funciona
            </Button>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section id="como-funciona" className="py-24 bg-card/50 relative border-y border-border/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">Para que serve o FilaLab?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nossa plataforma atua eliminando o caos da sua expedição. Desde o preparo do pedido até o motoboy sair para a entrega.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <MonitorPlay className="w-32 h-32" />
              </div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">1. Organização Visual</h3>
              <p className="text-muted-foreground leading-relaxed">
                Revolucione a área de espera. O despachante utiliza o painel de roteirista para dar saída, enquanto a TV informa automaticamente o motoboy da vez.
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden mt-0 md:mt-8">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <MessageSquare className="w-32 h-32" />
              </div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">2. Comunicação Ágil</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sem gritaria no balcão: o entregador recebe mensagens automáticas pelo WhatsApp no momento em que a bag dele está pronta.
              </p>
            </div>

            <div className="bg-background p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden mt-0 md:mt-16">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Wallet className="w-32 h-32" />
              </div>
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-3">3. Fechamento Perfeito</h3>
              <p className="text-muted-foreground leading-relaxed">
                Controle o repasse (cash out) no final do turno com senhas em uma fila de pagamento. O histórico de corridas exporta automaticamente os registros.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Modulos Section */}
      <section id="modulos" className="py-24 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
            <div className="max-w-xl space-y-4">
              <h2 className="text-3xl md:text-4xl font-bold">Módulos Flexíveis</h2>
              <p className="text-muted-foreground">
                Assine apenas o que precisa. O administrador pode ativar funcionalidades específicas garantindo custo reduzido e precisão cirúrgica na sua operação.
              </p>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => window.open(whatsappLink, '_blank')}>
              Ver Tabela de Preços
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 transition-colors group">
              <MessageSquare className="w-8 h-8 text-green-500 mb-4 group-hover:-translate-y-1 transition-transform" />
              <h4 className="text-lg font-semibold mb-2">WhatsApp Avançado</h4>
              <p className="text-sm text-muted-foreground">Disparo e integração via Evolution API para avisos de rotas direto no celular do motoboy.</p>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 transition-colors group">
              <MonitorPlay className="w-8 h-8 text-blue-500 mb-4 group-hover:-translate-y-1 transition-transform" />
              <h4 className="text-lg font-semibold mb-2">TV Premium</h4>
              <p className="text-sm text-muted-foreground">Despacho com anúncios de voz sintéticos (Text-to-Speech) exclusivos e alta personalização.</p>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 transition-colors group">
              <FileSpreadsheet className="w-8 h-8 text-emerald-500 mb-4 group-hover:-translate-y-1 transition-transform" />
              <h4 className="text-lg font-semibold mb-2">Google Sheets</h4>
              <p className="text-sm text-muted-foreground">Sincronização em tempo real de todo o relatório de pagamentos via Google Apps Script (Webhooks).</p>
            </div>
            <div className="bg-card p-6 rounded-2xl border border-border hover:border-primary/50 transition-colors group">
              <Wallet className="w-8 h-8 text-amber-500 mb-4 group-hover:-translate-y-1 transition-transform" />
              <h4 className="text-lg font-semibold mb-2">Fila de Pagamentos</h4>
              <p className="text-sm text-muted-foreground">Gere senhas numéricas para fila de recebimento ao fim do expediente com preview em TV secundária.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Banner de CTA Final */}
      <section className="py-20 relative px-4">
        <div className="container mx-auto max-w-5xl bg-primary/10 border border-primary/20 rounded-3xl p-8 md:p-14 text-center relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

          <div className="relative z-10 space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Pronto para transformar sua logística?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Junte-se a diversas franquias que deixaram o fluxo manual no passado e aumentaram a velocidade de entrega com o FilaLab.
            </p>
            <div className="pt-4">
              <Button size="lg" className="rounded-full px-10 h-14 text-lg shadow-lg hover:shadow-primary/25" onClick={() => window.open(whatsappLink, '_blank')}>
                Falar com Consultor no WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t border-border bg-card/30 pt-16 pb-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2">
                <Pizza className="w-6 h-6 text-primary" />
                <span className="text-xl font-bold font-mono">FilaLab</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs">
                O ecossistema definitivo para gerenciar entregadores, filas e rotas em estabelecimentos de alto fluxo logístico de entregas (delivery).
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Plataforma</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => scrollToSection('home')} className="hover:text-primary transition-colors">Início</button></li>
                <li><button onClick={() => scrollToSection('como-funciona')} className="hover:text-primary transition-colors">Funcionalidades</button></li>
                <li><button onClick={() => scrollToSection('modulos')} className="hover:text-primary transition-colors">Módulos</button></li>
                <li><Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary transition-colors" onClick={() => navigate('/login')}>Sistema Web (Login)</Button></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Contato</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> (11) 99999-9999
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> contato@filalab.com.br
                </li>
              </ul>
              <div className="flex gap-4 pt-2">
                <a href="#" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} FilaLab. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-foreground transition-colors">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center z-50 transition-transform hover:scale-110 animate-bounce"
        style={{ animationDuration: '3s' }}
        title="Fale conosco no WhatsApp"
      >
        <MessageSquare className="w-7 h-7" />
      </a>
    </div>
  );
}
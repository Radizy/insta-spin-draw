import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Unidade } from '@/lib/api';
import { UnitSelector } from './UnitSelector';
import { Settings, Users, Tv, UserCheck, Pizza, ArrowLeft, LogOut, Ticket, History } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { UnitSwitcher } from './UnitSwitcher';
import { MessageSquare } from 'lucide-react';
import { SystemUpdatesWidget } from './SystemUpdatesWidget';
import { useTraining } from '@/contexts/TrainingContext';
import { TrainingOverlay } from './TrainingOverlay';

const whatsappNumber = "5511954545985";
const whatsappMessage = encodeURIComponent("Olá! Gostaria de suporte no sistema FilaLab.");
const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const navItems = [
  { path: '/config', label: 'Configuração', icon: Settings },
  { path: '/roteirista', label: 'Roteirista', icon: Users },
  { path: '/fila-pagamento', label: 'Pagamento', icon: Ticket },
  { path: '/tv', label: 'TV', icon: Tv },
  { path: '/historico', label: 'Histórico', icon: History },
];

export function Layout({ children, showHeader = true }: LayoutProps) {
  const location = useLocation();
  const { selectedUnit, setSelectedUnit } = useUnit();
  const { user, logout, restoreAdmin } = useAuth();
  const { isTrainingMode, stopTraining } = useTraining();
  const navigate = useNavigate();

  const canChangeUnit = user?.role === 'super_admin' || user?.role === 'admin_franquia';

  // Não mostrar logout em rotas específicas
  const hideLogout = location.pathname === '/tv';

  const handleChangeUnit = (unit: Unidade) => {
    if (user?.role === 'super_admin') {
      setSelectedUnit(unit);
      return;
    }

    if (user?.role === 'admin_franquia') {
      setSelectedUnit(unit);
      return;
    }

    if (user?.role === 'operador' && user.unidade && user.unidade !== unit) {
      toast.error('Você só pode acessar a sua própria unidade.');
      return;
    }

    setSelectedUnit(unit);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logout realizado com sucesso');
  };

  if (!showHeader) {
    return <>{children}</>;
  }

  const isAdminRoute = location.pathname === '/admin';
  const isSimulatingStore = user?.role === 'super_admin' && !isAdminRoute && selectedUnit !== null;

  return (
    <div className="min-h-screen bg-background relative">
      {isTrainingMode && (
        <div className="w-full bg-blue-600 text-white font-bold text-center py-2 text-sm sticky top-0 z-[100] shadow-md flex items-center justify-center gap-4">
          <span>⚠️ Você está no Ambiente de Treinamento. Dados são fictícios.</span>
          <button onClick={stopTraining} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors text-xs font-semibold">
            Sair do Treinamento
          </button>
        </div>
      )}

      {isTrainingMode && <TrainingOverlay />}

      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Pizza className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="font-mono font-bold text-lg">FilaLab</span>
            </Link>

          </div>

          {selectedUnit && !isAdminRoute && (
            <div className="flex items-center gap-4">
              {isSimulatingStore && (
                <button
                  onClick={async () => {
                    await restoreAdmin();
                    setSelectedUnit(null as any);
                    navigate('/admin');
                  }}
                  className="animate-pulse flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-sm transition-all bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 mr-2"
                  title="Você está acessando dados desta loja como Super Admin"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Sair do Modo Loja
                </button>
              )}
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                        'hover:bg-secondary',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Seletor de unidade multiloja */}
              <UnitSwitcher />

              {!hideLogout && (
                <>
                  <span className="text-border">|</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-muted-foreground hover:text-foreground hover:bg-secondary"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Sair</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container py-8 animate-fade-in">{children}</main>

      <SystemUpdatesWidget />

      {/* Floating WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-4 items-end">
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-xl flex items-center justify-center transition-transform hover:scale-110 animate-bounce group relative"
          style={{ animationDuration: '3s' }}
        >
          <MessageSquare className="w-7 h-7" />

          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg flex items-center border border-slate-700">
            Suporte via WhatsApp
            <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-t border-r border-slate-700"></div>
          </div>
        </a>
      </div>
    </div>
  );
}

export function BackButton() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Voltar ao início</span>
    </Link>
  );
}

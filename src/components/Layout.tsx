import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnit } from '@/contexts/UnitContext';
import { useAuth } from '@/contexts/AuthContext';
import { Unidade } from '@/lib/api';
import { UnitSelector } from './UnitSelector';
import {
  Settings, Users, Tv, UserCheck, Pizza, ArrowLeft, LogOut, Ticket, History,
  CreditCard, X as XIcon, MessageSquare, Menu, X
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { UnitSwitcher } from './UnitSwitcher';
import { SystemUpdatesWidget } from './SystemUpdatesWidget';
import { useTraining } from '@/contexts/TrainingContext';
import { TrainingOverlay } from './TrainingOverlay';
import { MaquininhaControlModal } from './MaquininhaControlModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [maquinhaOpen, setMaquinhaOpen] = useState(false);

  // Módulo de maquininhas: verificar se está ativo para a franquia
  const { data: franquiaConfig } = useQuery({
    queryKey: ['franquia-config', user?.franquiaId],
    queryFn: async () => {
      if (!user?.franquiaId) return null;
      const { data, error } = await supabase
        .from('franquias')
        .select('config_pagamento')
        .eq('id', user.franquiaId)
        .maybeSingle();

      if (error) throw error;
      return (data?.config_pagamento as any) || {};
    },
    enabled: !!user?.franquiaId,
  });

  const isMachineModuleActive = franquiaConfig?.modulos_ativos?.includes('controle_maquininhas');

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
            <>
              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-4">
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

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center gap-2">
                <UnitSwitcher />
                <button
                  className="p-2 -mr-2 text-foreground"
                  onClick={() => setMobileMenuOpen(true)}
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {selectedUnit && !isAdminRoute && (
        <>
          {mobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          <div className={`md:hidden fixed top-0 right-0 w-[85%] max-w-sm h-full bg-background border-l border-border z-50 shadow-2xl transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
            <div className="flex items-center justify-between p-6 border-b border-border">
              <span className="text-xl font-bold font-mono tracking-tight text-primary">Menu</span>
              <button className="p-2 -mr-2 text-foreground rounded-md hover:bg-secondary" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col p-4 overflow-y-auto flex-1 gap-2">
              {isSimulatingStore && (
                <button
                  onClick={async () => {
                    await restoreAdmin();
                    setSelectedUnit(null as any);
                    navigate('/admin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full mb-4 animate-pulse flex items-center justify-center gap-2 p-3 rounded-lg font-bold text-sm shadow-sm transition-all bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20"
                >
                  <ArrowLeft className="w-4 h-4" /> Sair do Modo Loja
                </button>
              )}

              <div className="flex flex-col">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Navegação</span>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg transition-all text-base font-medium',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-secondary'
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {!hideLogout && (
              <div className="p-4 border-t border-border mt-auto bg-muted/20">
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-lg transition-all text-destructive hover:bg-destructive/10 font-medium"
                >
                  <LogOut className="w-5 h-5" />
                  Sair do Sistema
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <main className="container py-8 animate-fade-in">{children}</main>

      <SystemUpdatesWidget />

      {isMachineModuleActive && (
        <MaquininhaControlModal
          open={maquinhaOpen}
          onOpenChange={setMaquinhaOpen}
        />
      )}

      {/* Maquininha Button - Only visible if module is active and store is selected */}
      {isMachineModuleActive && selectedUnit && (
        <button
          onClick={() => setMaquinhaOpen(true)}
          className="fixed bottom-[168px] right-6 w-14 h-14 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-xl flex items-center justify-center z-50 transition-all hover:scale-110 group"
          title="Controle de Maquininhas"
        >
          {/* POS Terminal SVG */}
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <rect x="7" y="4" width="10" height="5" rx="1" />
            <line x1="7" y1="12" x2="9" y2="12" />
            <line x1="11" y1="12" x2="13" y2="12" />
            <line x1="15" y1="12" x2="17" y2="12" />
            <line x1="7" y1="15" x2="9" y2="15" />
            <line x1="11" y1="15" x2="13" y2="15" />
            <line x1="15" y1="15" x2="17" y2="15" />
            <line x1="7" y1="18" x2="9" y2="18" />
            <line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-slate-200 text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg flex items-center gap-2 border border-slate-700">
            Controle de Maquininhas
            <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-t border-r border-slate-700" />
          </div>
        </button>
      )}

      {/* WhatsApp */}
      <div className="fixed bottom-6 right-6 z-50">
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
            <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45 border-t border-r border-slate-700" />
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

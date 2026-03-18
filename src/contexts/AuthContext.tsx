import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, setAuthToken } from '@/integrations/supabase/client';
import { Unidade } from '@/lib/api';

interface User {
  id: string;
  username: string;
  // Papel derivado a partir dos campos da tabela system_users
  role: 'super_admin' | 'admin_franquia' | 'operador';
  unidade: Unidade;
  franquiaId: string | null;
  unidadeId: string | null;
  availableUnits?: Array<{ id: string; nome_loja: string; unidade_nome: Unidade }>;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, unidade?: Unidade) => Promise<User | null>;
  logout: () => void | Promise<void>;
  changeUnit: (unidade: Unidade, unidadeId?: string, franquiaId?: string) => Promise<void>;
  restoreAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'fila_auth_session';
const TOKEN_STORAGE_KEY = 'fila_auth_tokens';

interface StoredSession extends User {
  loggedAt: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StoredSession;
        const loggedAt = new Date(parsed.loggedAt);
        const now = new Date();

        // Calcula último corte diário às 05:00
        const cutoff = new Date(now);
        cutoff.setHours(5, 0, 0, 0);
        if (now < cutoff) {
          // Antes das 05:00, considera o corte de hoje como o dia anterior
          cutoff.setDate(cutoff.getDate() - 1);
        }

        if (loggedAt < cutoff) {
          // Sessão anterior ao último corte: força novo login
          localStorage.removeItem(AUTH_STORAGE_KEY);
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        } else {
          setUser(parsed as unknown as User);
          // Restore the token if it exists in sessionStorage
          const storedTokens = sessionStorage.getItem(TOKEN_STORAGE_KEY);
          if (storedTokens) {
            const parsedTokens = JSON.parse(storedTokens) as StoredTokens;
            if (parsedTokens.accessToken) {
              setAuthToken(parsedTokens.accessToken);
            }
          }
        }
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, unidade?: Unidade): Promise<User | null> => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUsername || !trimmedPassword) return null;

    const { data, error } = await supabase.functions.invoke('auth-login', {
      body: { username: trimmedUsername, password: trimmedPassword },
    });

    if (error || !data) {
      return null;
    }

    const { user: apiUser, tokens } = data as { user: User; tokens: StoredTokens };

    // Validar unidade, se fornecida (mantém regra de negócio)
    if (unidade && apiUser.unidade !== unidade) {
      return null;
    }

    const userData: User = {
      id: apiUser.id,
      username: apiUser.username,
      role: apiUser.role,
      unidade: apiUser.unidade,
      franquiaId: apiUser.franquiaId ?? null,
      unidadeId: apiUser.unidadeId ?? null,
      availableUnits: apiUser.availableUnits,
    };

    setUser(userData);
    const stored: StoredSession = { ...(userData as any), loggedAt: new Date().toISOString() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));

    if (tokens?.accessToken && tokens?.refreshToken && tokens?.accessTokenExpiresAt) {
      const tokenPayload: StoredTokens = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      };
      sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenPayload));
      setAuthToken(tokens.accessToken);
    }

    return userData;
  };

  const changeUnit = async (newUnidade: Unidade, novaUnidadeId?: string, novaFranquiaId?: string) => {
    if (!user) return;

    // Verificar se o usuário tem acesso a esta unidade
    const hasAccess = user.availableUnits?.some(
      (u) => u.nome_loja === newUnidade || u.unidade_nome === newUnidade
    );

    if (!hasAccess && user.role !== 'super_admin') {
      throw new Error('Você não tem acesso a esta unidade');
    }

    let newUnidadeId = novaUnidadeId || null;
    let newFranquiaId = novaFranquiaId || null;

    if (!newUnidadeId && user.availableUnits) {
      const u = user.availableUnits.find(x => x.unidade_nome === newUnidade || x.nome_loja === newUnidade);
      if (u) newUnidadeId = u.id;
    }

    const updatedUser = {
      ...user,
      unidade: newUnidade,
      unidadeId: newUnidadeId ?? user.unidadeId,
      franquiaId: newFranquiaId ?? user.franquiaId
    };

    setUser(updatedUser);
    const stored: StoredSession = { ...(updatedUser as any), loggedAt: new Date().toISOString() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
  };

  const restoreAdmin = async () => {
    if (!user || user.role !== 'super_admin') return;

    // O Super Admin original tem a raiz Master nula (exceto a role)
    const updatedUser = {
      ...user,
      unidade: '' as Unidade,
      unidadeId: null,
      franquiaId: null
    };

    setUser(updatedUser);
    const stored: StoredSession = { ...(updatedUser as any), loggedAt: new Date().toISOString() };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
  };

  const logout = async () => {
    try {
      const storedTokens = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedTokens) {
        const parsed = JSON.parse(storedTokens) as StoredTokens;
        if (parsed.refreshToken) {
          await supabase.functions.invoke('auth-logout', {
            body: { refreshToken: parsed.refreshToken },
          });
        }
      }
    } catch {
      // falha de rede não deve impedir logout local
    }

    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, changeUnit, restoreAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

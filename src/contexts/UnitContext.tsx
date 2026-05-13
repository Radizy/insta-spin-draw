import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Unidade } from '@/lib/api';
import { useAuth } from './AuthContext';

interface UnitContextType {
  selectedUnit: Unidade | null;
  setSelectedUnit: (unit: Unidade | null) => void;
}

const UnitContext = createContext<UnitContextType | undefined>(undefined);

const UNIT_STORAGE_KEY = 'fila_selected_unit';

export function UnitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedUnit, setSelectedUnit] = useState<Unidade | null>(() => {
    return (localStorage.getItem(UNIT_STORAGE_KEY) as Unidade) || null;
  });

  useEffect(() => {
    if (user) {
      const storedUserId = localStorage.getItem(`${UNIT_STORAGE_KEY}_uid`);
      const storedUnit = localStorage.getItem(UNIT_STORAGE_KEY);

      if (storedUserId !== user.id) {
        // Usuário diferente do que estava cacheado: sempre reseta para a unidade dele
        localStorage.setItem(`${UNIT_STORAGE_KEY}_uid`, user.id);
        if (user.unidade) {
          setSelectedUnit(user.unidade as Unidade);
          localStorage.setItem(UNIT_STORAGE_KEY, user.unidade);
        } else {
          setSelectedUnit(null);
          localStorage.removeItem(UNIT_STORAGE_KEY);
        }
      } else if (!storedUnit && user.unidade) {
        // Mesmo usuário, mas sem unidade no storage (primeira vez)
        setSelectedUnit(user.unidade as Unidade);
        localStorage.setItem(UNIT_STORAGE_KEY, user.unidade);
      }
    } else {
      // Logout: limpa tudo
      setSelectedUnit(null);
      localStorage.removeItem(UNIT_STORAGE_KEY);
      localStorage.removeItem(`${UNIT_STORAGE_KEY}_uid`);
    }
  }, [user]);

  const handleSetSelectedUnit = (unit: Unidade | null) => {
    setSelectedUnit(unit);
    if (unit) {
      localStorage.setItem(UNIT_STORAGE_KEY, unit);
    } else {
      localStorage.removeItem(UNIT_STORAGE_KEY);
    }
  };

  return (
    <UnitContext.Provider value={{ selectedUnit, setSelectedUnit: handleSetSelectedUnit }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit() {
  const context = useContext(UnitContext);
  if (context === undefined) {
    throw new Error('useUnit must be used within a UnitProvider');
  }
  return context;
}

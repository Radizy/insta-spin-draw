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
    // Se o usuário logou e não tínhamos selecionado unidade no local storage, usa a dele
    if (user && user.unidade && !localStorage.getItem(UNIT_STORAGE_KEY)) {
      setSelectedUnit(user.unidade);
      localStorage.setItem(UNIT_STORAGE_KEY, user.unidade);
    } else if (!user) {
      // Se deslogou, limpa a unidade
      setSelectedUnit(null);
      localStorage.removeItem(UNIT_STORAGE_KEY);
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

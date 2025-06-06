
// @/context/FabContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface FabContextType {
  isFabOpen: boolean;
  setIsFabOpen: (isOpen: boolean) => void;
  toggleFab: () => void;
}

const FabContext = createContext<FabContextType | undefined>(undefined);

export function FabProvider({ children }: { children: ReactNode }) {
  const [isFabOpen, setIsFabOpen] = useState(false);

  const toggleFab = useCallback(() => {
    setIsFabOpen(prev => !prev);
  }, []);

  return (
    <FabContext.Provider value={{ isFabOpen, setIsFabOpen, toggleFab }}>
      {children}
    </FabContext.Provider>
  );
}

export function useFab() {
  const context = useContext(FabContext);
  if (context === undefined) {
    throw new Error('useFab must be used within a FabProvider');
  }
  return context;
}

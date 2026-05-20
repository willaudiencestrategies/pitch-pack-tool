'use client';

import { createContext, useContext, ReactNode } from 'react';
import { SessionState } from '../types';
import { UseHandlersReturn } from './useHandlers';
import { UseProgressHooksReturn } from './useProgressHooks';

export interface BriefStateContextValue {
  state: SessionState;
  updateState: (partial: Partial<SessionState>) => void;
  handlers: UseHandlersReturn;
  progress: UseProgressHooksReturn;
  pushHistory: (action: string, statePatch: Partial<SessionState>) => void;
  lastAction: (() => void) | null;
  setLastAction: (action: (() => void) | null) => void;
}

const BriefStateContext = createContext<BriefStateContextValue | null>(null);

export function BriefStateProvider({
  value,
  children,
}: {
  value: BriefStateContextValue;
  children: ReactNode;
}) {
  return (
    <BriefStateContext.Provider value={value}>
      {children}
    </BriefStateContext.Provider>
  );
}

export function useBriefState(): BriefStateContextValue {
  const ctx = useContext(BriefStateContext);
  if (!ctx) {
    throw new Error('useBriefState must be used within BriefStateProvider');
  }
  return ctx;
}

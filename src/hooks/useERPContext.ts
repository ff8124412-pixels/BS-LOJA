import { createContext, useContext } from 'react';
import type { ERPStore } from './useERPStore';

export const ERPContext = createContext<ERPStore | null>(null);

export function useERP(): ERPStore {
  const ctx = useContext(ERPContext);
  if (!ctx) throw new Error('useERP must be used inside ERPProvider');
  return ctx;
}

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/auth-context';

interface BranchContextType {
  selectedBranchId: string | null;
  setSelectedBranchId: (branchId: string | null) => void;
  getEffectiveBranchId: () => string | null;
  isAdmin: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

const SELECTED_BRANCH_KEY = 'selectedBranchId';

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(null);

  // Verificar se é admin - suporta 'ADMIN', 'admin', 'Administrator', 'Administrador', etc.
  const roleName = (user?.role?.name ?? '').toLowerCase();
  const isAdmin = ['admin', 'administrator', 'administrador', 'superadmin'].includes(roleName);

  // Carregar filial selecionada do localStorage (apenas para admin)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isAdmin) {
      const stored = localStorage.getItem(SELECTED_BRANCH_KEY);
      if (stored) {
        setSelectedBranchIdState(stored);
      }
    } else {
      // Para não-admin, limpar qualquer seleção armazenada
      localStorage.removeItem(SELECTED_BRANCH_KEY);
      setSelectedBranchIdState(null);
    }
  }, [isAdmin]);

  // Invalidar queries quando a filial selecionada mudar (apenas para admin)
  useEffect(() => {
    if (isAdmin) {
      // Invalidar todas as queries quando a filial mudar
      // Usar um pequeno delay para garantir que o estado foi atualizado
      const timeoutId = setTimeout(() => {
        queryClient.invalidateQueries();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [selectedBranchId, isAdmin, queryClient]);

  const setSelectedBranchId = (branchId: string | null) => {
    setSelectedBranchIdState(branchId);
    if (typeof window !== 'undefined') {
      if (branchId) {
        localStorage.setItem(SELECTED_BRANCH_KEY, branchId);
      } else {
        localStorage.removeItem(SELECTED_BRANCH_KEY);
      }
    }
    // Invalidar todas as queries que dependem de branchId para refetch automático
    queryClient.invalidateQueries();
  };

  // Retorna a filial efetiva: selecionada para admin, do perfil para outros
  const getEffectiveBranchId = (): string | null => {
    if (isAdmin) {
      return selectedBranchId;
    }
    // Para não-admin, usar a filial do perfil do usuário
    return user?.branchId || null;
  };

  return (
    <BranchContext.Provider
      value={{
        selectedBranchId,
        setSelectedBranchId,
        getEffectiveBranchId,
        isAdmin,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}

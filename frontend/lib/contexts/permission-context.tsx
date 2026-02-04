'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

interface PermissionContextType {
  /**
   * Lista de permissões do usuário atual
   */
  permissions: string[];

  /**
   * Verifica se o usuário é admin (tem acesso total)
   */
  isAdmin: boolean;

  /**
   * Verifica se o usuário tem uma permissão específica
   * Admin sempre retorna true (bypass)
   */
  hasPermission: (permission: string) => boolean;

  /**
   * Verifica se o usuário tem TODAS as permissões especificadas
   * Admin sempre retorna true (bypass)
   */
  hasAllPermissions: (permissions: string[]) => boolean;

  /**
   * Verifica se o usuário tem PELO MENOS UMA das permissões especificadas
   * Admin sempre retorna true (bypass)
   */
  hasAnyPermission: (permissions: string[]) => boolean;

  /**
   * Verifica se o usuário pode ver/acessar um módulo específico
   * Retorna true se tiver qualquer permissão do módulo
   */
  canAccessModule: (module: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<PermissionContextType>(() => {
    const permissions = user?.permissions || [];
    const roleName = user?.role?.name ?? '';
    const isAdmin = ['admin', 'administrator', 'superadmin'].includes(roleName.toLowerCase());

    const hasPermission = (permission: string): boolean => {
      if (isAdmin) return true;
      return permissions.includes(permission);
    };

    const hasAllPermissions = (perms: string[]): boolean => {
      if (isAdmin) return true;
      return perms.every((p) => permissions.includes(p));
    };

    const hasAnyPermission = (perms: string[]): boolean => {
      if (isAdmin) return true;
      return perms.some((p) => permissions.includes(p));
    };

    const canAccessModule = (module: string): boolean => {
      if (isAdmin) return true;
      return permissions.some((p) => p.startsWith(`${module}.`));
    };

    return {
      permissions,
      isAdmin,
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      canAccessModule,
    };
  }, [user]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions deve ser usado dentro de um PermissionProvider');
  }
  return context;
}

/**
 * Hook simples para verificar uma permissão específica
 */
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

/**
 * Hook para verificar acesso a um módulo
 */
export function useCanAccessModule(module: string): boolean {
  const { canAccessModule } = usePermissions();
  return canAccessModule(module);
}

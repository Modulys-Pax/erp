'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, AuthResponse, UserResponse } from '../api/auth';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Carregar token do localStorage
  const getStoredToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  };

  const getStoredRefreshToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  };

  const setStoredTokens = (accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setToken(accessToken);
  };

  const clearStoredTokens = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
  };

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const userData = await authApi.me();
        setUser(userData);
        setToken(storedToken);
      } catch (error) {
        // Token inválido, tentar refresh
        const refreshToken = getStoredRefreshToken();
        if (refreshToken) {
          try {
            const authResponse = await authApi.refresh(refreshToken);
            setStoredTokens(authResponse.accessToken, authResponse.refreshToken);
            setUser({
              ...authResponse.user,
              role: {
                ...authResponse.user.role,
                description: authResponse.user.role.description || null,
              },
            });
          } catch {
            // Refresh falhou, limpar tokens
            clearStoredTokens();
          }
        } else {
          clearStoredTokens();
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const authResponse = await authApi.login({ email, password });
    setStoredTokens(authResponse.accessToken, authResponse.refreshToken);
    setUser({
      ...authResponse.user,
      role: {
        ...authResponse.user.role,
        description: authResponse.user.role.description ?? null,
      },
      permissions: authResponse.user.permissions,
    });
    // Redirecionar com reload para garantir que permissões e contexto sejam carregados corretamente
    window.location.href = '/dashboard';
  };

  const logout = () => {
    clearStoredTokens();
    setUser(null);
    router.push('/login');
  };

  const refreshAuth = async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error('Nenhum refresh token disponível');
    }

    const authResponse = await authApi.refresh(refreshToken);
    setStoredTokens(authResponse.accessToken, authResponse.refreshToken);
    setUser({
      ...authResponse.user,
      role: {
        ...authResponse.user.role,
        description: authResponse.user.role.description ?? null,
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}

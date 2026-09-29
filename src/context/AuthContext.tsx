import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Client } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  client: Client | null;
  isImpersonating: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  impersonateClient: (clientId: string) => Promise<void>;
  returnToSuperAdmin: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  quickSwitchWorkspace: (type: 'admin' | string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAuth = async () => {
    try {
      const data = await api.getMe();
      if (data.success) {
        setUser(data.user);
        setClient(data.client || null);
        setIsImpersonating(!!data.isImpersonating);
      } else {
        // Fallback to super admin session if token stale
        localStorage.setItem('waba_session_token', 'session_superadmin_master_token_2026');
        const fallback = await api.getMe();
        if (fallback.success) {
          setUser(fallback.user);
          setClient(fallback.client || null);
          setIsImpersonating(false);
        }
      }
    } catch (e) {
      console.error('Auth error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If no token, set initial superadmin session
    if (!localStorage.getItem('waba_session_token')) {
      localStorage.setItem('waba_session_token', 'session_superadmin_master_token_2026');
    }
    refreshAuth();
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await api.login(email, pass);
      if (res.success) {
        localStorage.setItem('waba_session_token', res.token);
        setUser(res.user);
        setClient(res.client || null);
        setIsImpersonating(false);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Login error:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('waba_session_token');
    setUser(null);
    setClient(null);
    setIsImpersonating(false);
    // Reload super admin default for smooth testing
    quickSwitchWorkspace('admin');
  };

  const impersonateClient = async (clientId: string) => {
    setIsLoading(true);
    try {
      const res = await api.impersonate(clientId);
      if (res.success) {
        localStorage.setItem('waba_session_token', res.token);
        setUser(res.user);
        setClient(res.client);
        setIsImpersonating(true);
      }
    } catch (e) {
      console.error('Impersonation error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const returnToSuperAdmin = async () => {
    setIsLoading(true);
    try {
      const res = await api.stopImpersonation();
      if (res.success) {
        localStorage.setItem('waba_session_token', res.token);
        setUser(res.user);
        setClient(null);
        setIsImpersonating(false);
      }
    } catch (e) {
      console.error('Stop impersonation error:', e);
      // Fallback
      localStorage.setItem('waba_session_token', 'session_superadmin_master_token_2026');
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const quickSwitchWorkspace = async (target: 'admin' | string) => {
    setIsLoading(true);
    try {
      if (target === 'admin') {
        localStorage.setItem('waba_session_token', 'session_superadmin_master_token_2026');
      } else if (target === 'CLT-00001') {
        localStorage.setItem('waba_session_token', 'session_client1_abc_salon_token_2026');
      } else {
        // Use impersonate
        localStorage.setItem('waba_session_token', 'session_superadmin_master_token_2026');
        const res = await api.impersonate(target);
        if (res.success) {
          localStorage.setItem('waba_session_token', res.token);
        }
      }
      await refreshAuth();
    } catch (e) {
      console.error('Quick switch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        client,
        isImpersonating,
        isLoading,
        login,
        logout,
        impersonateClient,
        returnToSuperAdmin,
        refreshAuth,
        quickSwitchWorkspace
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

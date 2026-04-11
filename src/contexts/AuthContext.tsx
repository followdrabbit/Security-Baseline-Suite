import React, { createContext, useContext, useEffect, useState } from 'react';
import { localDb } from '@/integrations/localdb/client';

type AuthUser = {
  id: string;
  email?: string;
  username?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type AuthSession = {
  access_token: string;
  refresh_token?: string;
  user: AuthUser;
  [key: string]: unknown;
};

type AuthError = { message: string; code?: string } | null;
type ManagedUser = {
  id: string;
  username: string;
  role: string;
  must_change_password: boolean;
  created_at: string;
  updated_at?: string;
  password_changed_at?: string | null;
};

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: AuthError }>;
  completeFirstLoginPasswordChange: (params: {
    username: string;
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ error: AuthError }>;
  changePassword: (params: { currentPassword: string; newPassword: string }) => Promise<{ error: AuthError }>;
  listUsers: () => Promise<{ data: ManagedUser[]; error: AuthError }>;
  createUser: (params: { username: string; password: string }) => Promise<{ data: ManagedUser | null; error: AuthError }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = localDb.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    localDb.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    const { error } = await localDb.auth.signInWithPassword({ username, password });
    return { error };
  };

  const completeFirstLoginPasswordChange = async (params: {
    username: string;
    currentPassword: string;
    newPassword: string;
  }) => {
    const { error } = await localDb.auth.changePasswordFirstLogin(params);
    return { error };
  };

  const changePassword = async (params: { currentPassword: string; newPassword: string }) => {
    const { error } = await localDb.auth.changePassword(params);
    return { error };
  };

  const listUsers = async () => {
    const { data, error } = await localDb.auth.listUsers();
    return { data, error };
  };

  const createUser = async (params: { username: string; password: string }) => {
    const { data, error } = await localDb.auth.createUser(params);
    return { data, error };
  };

  const signOut = async () => {
    await localDb.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signIn,
        completeFirstLoginPasswordChange,
        changePassword,
        listUsers,
        createUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};



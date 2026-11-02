'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { api } from '@/lib/apiClient';
import { UserProfile, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    pass: string,
    fullName: string,
    phone: string,
    role: UserRole
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: 'passenger',
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('passenger');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfileAndSync = async (currentUser: User) => {
    try {
      // Sync with Flask backend
      const metaRole = (currentUser.user_metadata?.role as UserRole) || 'passenger';
      const metaName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
      const metaPhone = currentUser.user_metadata?.phone || '';

      const { data, error } = await api.post('/api/auth/sync', {
        role: metaRole,
        full_name: metaName,
        phone: metaPhone,
      });

      if (data) {
        setProfile(data);
        setRole(data.role || metaRole);
      } else {
        // Fallback to metadata
        setRole(metaRole);
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          full_name: metaName,
          phone: metaPhone,
          role: metaRole,
        });
      }
    } catch (err) {
      console.error('Error syncing profile:', err);
    }
  };

  useEffect(() => {
    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfileAndSync(initialSession.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfileAndSync(newSession.user);
      } else {
        setProfile(null);
        setRole('passenger');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        await fetchProfileAndSync(data.user);
      }
      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || 'Login failed' };
    }
  };

  const signUp = async (
    email: string,
    pass: string,
    fullName: string,
    phone: string,
    targetRole: UserRole
  ) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
            phone,
            role: targetRole,
          },
        },
      });

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        await fetchProfileAndSync(data.user);
      }
      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || 'Registration failed' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole('passenger');
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndSync(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


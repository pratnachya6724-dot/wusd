'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  isRider: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  needsOnboarding: boolean;
  sendOtp: (email: string) => Promise<{ error: any; success?: boolean }>;
  verifyOtp: (email: string, otp: string, name?: string) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setProfile(data as Profile);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        shouldCreateUser: true
      }
    });
    if (error) return { error };
    return { success: true };
  };

  const verifyOtp = async (email: string, otp: string, name: string = '') => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    });

    if (error) return { error };

    if (data.user) {
      const isInitialAdmin = email === 'pratnachya6724@gmail.com';
      
      // Upsert profile
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email,
        name: name || profile?.name || email.split('@')[0],
        role: isInitialAdmin ? 'admin' : (profile?.role || 'customer'),
        is_super_admin: isInitialAdmin
      }, { onConflict: 'id' });

      await fetchProfile(data.user.id);
    }

    return { data };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const isAdmin = profile?.role === 'admin' || profile?.is_super_admin === true;
  const isRider = profile?.role === 'rider';
  const isSuperAdmin = profile?.is_super_admin === true;
  const needsOnboarding = !!user && !!profile && !profile.name;

  return (
    <AuthContext.Provider value={{
      user, profile, isAdmin, isRider, isSuperAdmin, loading, needsOnboarding,
      sendOtp, verifyOtp, signOut, refreshProfile
    } as AuthContextType}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

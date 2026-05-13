'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, ADMIN_EMAIL } from '@/lib/supabase';
import { Profile } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: 'customer' | 'rider' | 'admin' | null;
  isAdmin: boolean;
  isRider: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  needsOnboarding: boolean;
  signInWithPhoneMock: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtpMock: (phone: string, otp: string, name?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ใช้สำหรับจำลอง OTP และสร้าง User
const getPseudoEmail = (phone: string) => `${phone}@wus.local`;
const getPseudoPassword = (phone: string) => `WusPhoneMock!${phone}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setProfile(data as Profile);
      return data as Profile;
    }
    return null;
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

  // จำลองการส่ง OTP (จริงๆ ไม่ได้ส่ง แค่เช็คว่าผ่านไหม)
  const signInWithPhoneMock = async (phone: string) => {
    if (!phone || phone.length < 9) {
      return { error: new Error('เบอร์โทรศัพท์ไม่ถูกต้อง') };
    }
    // ในระบบจริง จะเรียก supabase.auth.signInWithOtp({ phone })
    return { error: null };
  };

  // จำลองการยืนยัน OTP โดยใช้ Email/Password จำลองสมัครหรือล็อกอิน
  const verifyOtpMock = async (phone: string, otp: string, name: string = '') => {
    if (otp !== '123456') {
      return { error: new Error('รหัส OTP ไม่ถูกต้อง') };
    }

    const email = getPseudoEmail(phone);
    const password = getPseudoPassword(phone);

    // ลอง Sign in ก่อน
    const signInRes = await supabase.auth.signInWithPassword({ email, password });
    
    let finalUser: User | null = signInRes.data?.user;
    let finalError = signInRes.error;
    
    // ถ้าไม่มีบัญชี ให้สมัครใหม่
    if (finalError && finalError.message.includes('Invalid login credentials')) {
      const signUpRes = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || phone, phone } },
      });
      finalUser = signUpRes.data?.user;
      finalError = signUpRes.error;
    }

    // 1 เครื่อง 1 ไอดี: บันทึก Device ID ลง LocalStorage ถ้าล็อกอินสำเร็จ
    if (!finalError && finalUser) {
      // ตรวจสอบ Role เดิมก่อน เพื่อไม่ให้ทับสิทธิ์ (เช่น rider)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', finalUser.id)
        .single();

      // อัปเดต Profile ทุกครั้งที่ล็อกอินสำเร็จ เพื่อให้สิทธิ์ Admin เป็นปัจจุบัน
        await supabase.from('profiles').upsert({
          id: finalUser.id,
          name: name || phone,
          phone: phone,
          role: phone === '0930162164' ? 'admin' : (existingProfile?.role || 'customer'),
          is_super_admin: phone === '0930162164',
        }, { onConflict: 'id' });

      // โหลด Profile เข้า State ทันทีเพื่อป้องกัน Race Condition
      await fetchProfile(finalUser.id);

      const deviceId = localStorage.getItem('wus_device_id') || crypto.randomUUID();
      localStorage.setItem('wus_device_id', deviceId);
    }

    return { error: finalError as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error: error as Error | null };
  };

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const role = profile?.role ?? null;
  const isAdmin = role === 'admin' || user?.email === ADMIN_EMAIL;
  const isRider = role === 'rider';
  const isSuperAdmin = (profile?.is_super_admin ?? false) || user?.email === ADMIN_EMAIL;
  const needsOnboarding = !!user && !!profile && !profile.onboarding_done;

  return (
    <AuthContext.Provider value={{
      user, profile, role, isAdmin, isRider, isSuperAdmin,
      loading, needsOnboarding, signInWithPhoneMock, verifyOtpMock,
      signOut, refreshProfile, signInWithEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'otp';

export default function AuthPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.includes('@')) {
      setError('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }

    setLoading(true);
    const { error } = await sendOtp(email);
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (otp.length < 6) {
      setError('กรุณากรอกรหัส OTP 6 หลัก');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(email, otp, name.trim());
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.back();
    }
  };

  return (
    <div className="auth-page">
      <button onClick={() => router.back()} className="auth-back-btn">
        ← ย้อนกลับ
      </button>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🛵</span>
          <h1 className="auth-logo-text">WUS Delivery</h1>
        </div>

        <h2 className="auth-title">
          {step === 'email' ? 'เข้าสู่ระบบด้วยอีเมล' : 'ยืนยันรหัสจากอีเมล'}
        </h2>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth-email" className="form-label" style={{ color: '#fff' }}>อีเมล</label>
              <input
                id="auth-email"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="form-input"
                style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="auth-name" className="form-label" style={{ color: '#fff' }}>ชื่อ-นามสกุล <span style={{ color: 'var(--text-secondary)' }}>(กรณีใช้งานครั้งแรก)</span></label>
              <input
                id="auth-name"
                type="text"
                placeholder="ระบุชื่อของคุณ"
                value={name}
                onChange={e => setName(e.target.value)}
                className="form-input"
                style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}
              />
            </div>

            {error && <div className="auth-error">❌ {error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading || !email}>
              {loading ? '⏳ กำลังส่งรหัส...' : 'รับรหัส OTP ทางอีเมล'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="auth-form">
            <div style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text-secondary)' }}>
              <p>ระบบส่งรหัส OTP 6 หลักไปที่อีเมล<br/><strong>{email}</strong></p>
              <p style={{ fontSize: '0.8rem', marginTop: 8 }}>(กรุณาเช็คใน Inbox หรือ Junk Mail)</p>
            </div>

            <div className="form-group">
              <input
                id="auth-otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="form-input"
                style={{ textAlign: 'center', fontSize: '1.75rem', letterSpacing: '12px', background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)', padding: '16px' }}
                autoComplete="one-time-code"
              />
            </div>

            {error && <div className="auth-error">❌ {error}</div>}

            <button type="submit" className="auth-submit-btn" disabled={loading || otp.length < 6}>
              {loading ? '⏳ กำลังยืนยัน...' : 'ยืนยันตัวตน'}
            </button>
            
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={() => { setStep('email'); setOtp(''); setError(''); }}
              style={{ display: 'block', margin: '24px auto 0' }}
            >
              ← เปลี่ยนอีเมล
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

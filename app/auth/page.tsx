'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'phone' | 'otp';

export default function AuthPage() {
  const { sendOtp, verifyOtp } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState(''); // เก็บไว้เผื่อสมัครใหม่
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (phone.length < 9) {
      setError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง');
      return;
    }

    setLoading(true);
    const { error } = await sendOtp(phone);
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
    const { error } = await verifyOtp(phone, otp, name.trim());
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.back(); // กลับไปหน้าก่อนหน้า (เช่น หน้าร้านอาหาร หรือ หน้าแรก)
    }
  };

  return (
    <div className="auth-page">
      <button onClick={() => router.back()} className="auth-back-btn">
        ← ย้อนกลับ
      </button>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-icon">🛵</span>
          <h1 className="auth-logo-text">WUS Delivery</h1>
        </div>

        <h2 className="auth-title">
          {step === 'phone' ? 'เข้าสู่ระบบ / ลงทะเบียน' : 'ยืนยันรหัส OTP'}
        </h2>

        {/* Phone Step */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth-phone" className="form-label" style={{ color: '#fff' }}>เบอร์โทรศัพท์</label>
              <input
                id="auth-phone"
                type="tel"
                placeholder="0812345678"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
                className="form-input"
                autoComplete="tel"
                style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="auth-name" className="form-label" style={{ color: '#fff' }}>ชื่อ-นามสกุล <span style={{ color: 'var(--text-secondary)' }}>(กรณีใช้งานครั้งแรก)</span></label>
              <input
                id="auth-name"
                type="text"
                placeholder="ปล่อยว่างได้หากเคยใช้งานแล้ว"
                value={name}
                onChange={e => setName(e.target.value)}
                className="form-input"
                autoComplete="name"
                style={{ background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)' }}
              />
            </div>

            {error && <div className="auth-error">❌ {error}</div>}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || phone.length < 9}
            >
              {loading ? '⏳ กำลังดำเนินการ...' : 'ดำเนินการต่อ'}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="auth-form">
            <div style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text-secondary)' }}>
              <p>ระบบส่งรหัส OTP ไปที่ <strong>{phone}</strong></p>
            </div>

            <div className="form-group">
              <label htmlFor="auth-otp" className="form-label" style={{ color: '#fff', textAlign: 'center' }}>รหัส OTP 6 หลัก</label>
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

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading || otp.length < 6}
            >
              {loading ? '⏳ กำลังยืนยัน...' : 'ยืนยันตัวตน'}
            </button>
            
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              style={{ display: 'block', margin: '24px auto 0' }}
            >
              ← เปลี่ยนเบอร์โทรศัพท์
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { user, profile, refreshProfile, loading } = useAuth();
  const router = useRouter();

  const [address, setAddress] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      } else if (profile?.onboarding_done) {
        router.push('/');
      }
    }
  }, [loading, user, profile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('กรุณาใส่ที่อยู่หอพัก');
      return;
    }
    setSaving(true);
    setError('');

    const { error } = await supabase
      .from('profiles')
      .update({
        address: address.trim(),
        additional_info: additionalInfo.trim() || null,
        phone: phone.trim() || null,
        onboarding_done: true,
      })
      .eq('id', user!.id);

    if (error) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      setSaving(false);
      return;
    }

    await refreshProfile();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <div className="onboarding-icon">🏠</div>
          <h1 className="onboarding-title">ยินดีต้อนรับ!</h1>
          <p className="onboarding-subtitle">
            กรุณากรอกข้อมูลเพื่อเริ่มใช้งาน WUS Delivery
          </p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {/* Phone */}
          <div className="form-group">
            <label htmlFor="ob-phone">
              📱 เบอร์โทรศัพท์
              <span className="label-optional"> (ไม่บังคับ)</span>
            </label>
            <input
              id="ob-phone"
              type="tel"
              placeholder="0812345678"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="form-input"
              autoComplete="tel"
            />
          </div>

          {/* Address */}
          <div className="form-group">
            <label htmlFor="ob-address">
              📍 ที่อยู่หอพัก <span className="label-required">*</span>
            </label>
            <textarea
              id="ob-address"
              placeholder="เช่น หอพัก A ชั้น 3 ห้อง 310 มหาวิทยาลัย..."
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              className="form-textarea"
              rows={3}
            />
            <p className="field-hint">ที่อยู่นี้จะถูกใช้เป็นที่อยู่จัดส่งเริ่มต้น</p>
          </div>

          {/* Additional info */}
          <div className="form-group">
            <label htmlFor="ob-additional">
              📝 ข้อมูลเพิ่มเติม
              <span className="label-optional"> (ไม่บังคับ)</span>
            </label>
            <textarea
              id="ob-additional"
              placeholder="เช่น ห้องอยู่ตึก B ประตูใหม่ฝั่งซ้าย..."
              value={additionalInfo}
              onChange={e => setAdditionalInfo(e.target.value)}
              className="form-textarea"
              rows={2}
            />
          </div>

          {error && <p className="auth-error">❌ {error}</p>}

          <button
            type="submit"
            className="onboarding-submit-btn"
            disabled={saving}
          >
            {saving ? '⏳ กำลังบันทึก...' : '✅ เริ่มใช้งาน WUS Delivery'}
          </button>
        </form>
      </div>
    </div>
  );
}

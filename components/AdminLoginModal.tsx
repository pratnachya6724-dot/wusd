'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ADMIN_EMAIL } from '@/lib/supabase';

interface Props { onSuccess: () => void; onClose: () => void; }

export default function AdminLoginModal({ onSuccess, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (email !== ADMIN_EMAIL) { setError('อีเมลนี้ไม่มีสิทธิ์เข้าถึง Admin'); return; }
    setLoading(true);
    const { error: err } = await signInWithEmail(email, password);
    setLoading(false);
    if (err) { setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); return; }
    onSuccess();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <p className="modal-title">🔐 เข้าสู่ระบบ Admin</p>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
          เฉพาะผู้ดูแลระบบเท่านั้น
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">อีเมล</label>
            <input className="form-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="admin@email.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <input className="form-input" type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: 16 }}>⚠️ {error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : '🔓 เข้าสู่ระบบ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

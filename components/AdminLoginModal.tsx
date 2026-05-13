'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Props { onSuccess: () => void; onClose: () => void; }

export default function AdminLoginModal({ onSuccess, onClose }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { becomeAdminSecretly } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await becomeAdminSecretly(password);
    setLoading(false);
    if (err) { setError(err); return; }
    onSuccess();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <p className="modal-title">🔐 เปิดโหมด Admin</p>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>
          กรุณากรอกรหัสลับเพื่อแต่งตั้งคุณเป็นผู้ดูแลระบบ
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">รหัสลับ</label>
            <input 
              className="form-input" 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)} 
              placeholder="กรอกรหัสลับที่นี่..." 
              autoFocus
              required 
            />
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: 16 }}>⚠️ {error}</p>}
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'กำลังยืนยัน...' : '🔓 ยืนยันสิทธิ์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

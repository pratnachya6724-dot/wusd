'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { RiderApplication } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function RiderApplyPage() {
  const { user, isRider, loading } = useAuth();
  const router = useRouter();
  const [application, setApplication] = useState<RiderApplication | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) { router.push('/auth'); return; }
      if (isRider) { router.push('/rider/dashboard'); return; }
    }
  }, [loading, user, isRider, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('rider_applications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setApplication(data as RiderApplication);
        setFetching(false);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const { error: insertError } = await supabase
      .from('rider_applications')
      .insert({
        user_id: user!.id,
        note: note.trim() || null,
      });

    if (insertError) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
    } else {
      setSuccess('ส่งคำขอสำเร็จแล้ว! รอแอดมินอนุมัติ');
      const { data } = await supabase
        .from('rider_applications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (data) setApplication(data as RiderApplication);
    }
    setSubmitting(false);
  };

  if (loading || fetching) return (
    <div className="page-loading"><div className="spinner" /></div>
  );

  return (
    <div className="apply-page">
      <div className="apply-card">
        <div className="apply-header">
          <div className="apply-icon">🛵</div>
          <h1 className="apply-title">สมัครเป็นไรเดอร์</h1>
          <p className="apply-subtitle">ร่วมทีม WUS Delivery และรับรายได้เพิ่มเติม</p>
        </div>

        {/* Benefits */}
        <div className="apply-benefits">
          <div className="benefit-item">⏰ ทำงานได้ตามเวลาที่สะดวก</div>
          <div className="benefit-item">💵 รับค่าส่งโดยตรงจากลูกค้า</div>
          <div className="benefit-item">📱 แอปจัดการออเดอร์ง่าย</div>
        </div>

        {/* Status: pending */}
        {application?.status === 'pending' && (
          <div className="application-status pending">
            <p>⏳ คำขอของคุณอยู่ระหว่างการพิจารณา</p>
            <p className="status-sub">แอดมินจะตรวจสอบและแจ้งผลเร็วๆ นี้</p>
          </div>
        )}

        {/* Status: rejected */}
        {application?.status === 'rejected' && (
          <div className="application-status rejected">
            <p>❌ คำขอถูกปฏิเสธ</p>
            {application.note && <p className="status-sub">เหตุผล: {application.note}</p>}
            <p className="status-sub">คุณสามารถยื่นคำขอใหม่ได้</p>
          </div>
        )}

        {/* Form: show if no pending application */}
        {(!application || application.status === 'rejected') && (
          <form onSubmit={handleSubmit} className="apply-form">
            <div className="form-group">
              <label htmlFor="apply-note">
                ข้อมูลเพิ่มเติม (ไม่บังคับ)
              </label>
              <textarea
                id="apply-note"
                className="form-textarea"
                placeholder="เช่น ฉันมีรถมอเตอร์ไซค์ ว่างช่วงเย็น..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p className="auth-error">❌ {error}</p>}
            {success && <p className="auth-success">✅ {success}</p>}

            <button
              type="submit"
              className="apply-submit-btn"
              disabled={submitting}
            >
              {submitting ? '⏳ กำลังส่ง...' : '📤 ส่งคำขอ'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

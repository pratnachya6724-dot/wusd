'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile, RiderApplication, Order } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AdminTab = 'overview' | 'riders' | 'history' | 'admins' | 'restaurants';

export default function AdminPage() {
  const { user, isAdmin, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>('overview');

  // Overview stats
  const [stats, setStats] = useState({ orders: 0, riders: 0, pendingApps: 0, todayOrders: 0 });

  // Riders tab
  const [riders, setRiders] = useState<Profile[]>([]);
  const [applications, setApplications] = useState<(RiderApplication & { user?: Profile })[]>([]);

  // History tab
  const [history, setHistory] = useState<(Order & { customer?: Profile; rider?: Profile })[]>([]);

  // Admins tab
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/auth');
      else if (!isAdmin) router.push('/');
    }
  }, [loading, user, isAdmin, router]);

  const fetchAll = useCallback(async () => {
    // Stats
    const [{ count: orderCount }, { count: riderCount }, { count: pendingCount }] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'rider'),
      supabase.from('rider_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    setStats({
      orders: orderCount || 0,
      riders: riderCount || 0,
      pendingApps: pendingCount || 0,
      todayOrders: todayCount || 0,
    });

    if (tab === 'riders') {
      const { data: riderData } = await supabase.from('profiles').select('*').eq('role', 'rider');
      const { data: appData } = await supabase
        .from('rider_applications')
        .select('*, user:profiles(*)')
        .eq('status', 'pending');
      setRiders((riderData as Profile[]) || []);
      setApplications((appData as (RiderApplication & { user?: Profile })[]) || []);
    }

    if (tab === 'history') {
      const { data } = await supabase
        .from('orders')
        .select('*, customer:profiles!customer_id(*), rider:profiles!rider_id(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      setHistory((data as (Order & { customer?: Profile; rider?: Profile })[]) || []);
    }

    if (tab === 'admins') {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'admin');
      setAdmins((data as Profile[]) || []);
    }
  }, [tab]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    fetchAll();
  }, [user, isAdmin, fetchAll]);

  const handleApproveRider = async (application: RiderApplication & { user?: Profile }) => {
    setActionLoading(true);
    await supabase.from('profiles').update({ role: 'rider' }).eq('id', application.user_id);
    await supabase.from('rider_applications').update({
      status: 'approved', reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    }).eq('id', application.id);
    await fetchAll();
    setActionLoading(false);
  };

  const handleRejectRider = async (application: RiderApplication) => {
    setActionLoading(true);
    await supabase.from('rider_applications').update({
      status: 'rejected', reviewed_by: user!.id, reviewed_at: new Date().toISOString(),
    }).eq('id', application.id);
    await fetchAll();
    setActionLoading(false);
  };

  const handleDemoteRider = async (rider: Profile) => {
    if (!confirm(`ปลด ${rider.name} ออกจากตำแหน่งไรเดอร์?`)) return;
    setActionLoading(true);
    await supabase.from('profiles').update({ role: 'customer' }).eq('id', rider.id);
    await fetchAll();
    setActionLoading(false);
  };

  const handleAppointAdmin = async () => {
    const phone = newAdminEmail.trim();
    if (!phone) return;
    setActionLoading(true);
    
    // Find profile by phone
    const { data: target, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('phone', phone)
      .single();

    if (error || !target) {
      alert('ไม่พบผู้ใช้งานที่ใช้เบอร์นี้ กรุณาตรวจสอบเบอร์โทรศัพท์อีกครั้ง');
    } else {
      if (confirm(`ยืนยันการแต่งตั้ง ${target.name} เป็นแอดมิน?`)) {
        await supabase.from('profiles').update({ role: 'admin' }).eq('id', target.id);
        setNewAdminEmail('');
        await fetchAll();
      }
    }
    setActionLoading(false);
  };

  const handleRemoveAdmin = async (admin: Profile) => {
    if (admin.is_super_admin) { alert('ไม่สามารถถอด Super Admin ได้'); return; }
    if (!confirm(`ถอด ${admin.name} ออกจากตำแหน่งแอดมิน?`)) return;
    setActionLoading(true);
    await supabase.from('profiles').update({ role: 'customer' }).eq('id', admin.id);
    await fetchAll();
    setActionLoading(false);
  };

  if (loading) return <div className="page-loading"><div className="spinner" /></div>;

  const TABS: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'ภาพรวม', icon: '📊' },
    { key: 'riders', label: 'ไรเดอร์', icon: '🛵' },
    { key: 'history', label: 'ประวัติ', icon: '📋' },
    { key: 'restaurants', label: 'ร้านอาหาร', icon: '🍽️' },
    ...(isSuperAdmin ? [{ key: 'admins' as AdminTab, label: 'แอดมิน', icon: '👑' }] : []),
  ];

  const handleSeedData = async () => {
    if (!confirm('ยืนยันการลงข้อมูลตัวอย่าง? (ข้อมูลเดิมจะยังอยู่ แต่จะเพิ่มข้อมูลใหม่เข้าไป)')) return;
    setActionLoading(true);
    try {
      const { seedDatabase } = await import('../../lib/seed');
      await seedDatabase();
      alert('ลงข้อมูลตัวอย่างสำเร็จ!');
      await fetchAll();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="container">
        <h1 className="page-title">⚙️ แผงควบคุมแอดมิน</h1>

        {/* Tabs */}
        <div className="admin-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`admin-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="admin-overview">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-value">{stats.todayOrders}</div>
                <div className="stat-label">ออเดอร์วันนี้</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{stats.orders}</div>
                <div className="stat-label">ออเดอร์ทั้งหมด</div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">🛵</div>
                <div className="stat-value">{stats.riders}</div>
                <div className="stat-label">ไรเดอร์ทั้งหมด</div>
              </div>
              <div className="stat-card highlight">
                <div className="stat-icon">⏳</div>
                <div className="stat-value">{stats.pendingApps}</div>
                <div className="stat-label">รอพิจารณา</div>
              </div>
            </div>
            <div className="admin-quick-links">
              <Link href="/admin" onClick={() => setTab('riders')} className="quick-link">
                🛵 จัดการไรเดอร์
              </Link>
              <Link href="/admin" onClick={() => setTab('history')} className="quick-link">
                📋 ดูประวัติออเดอร์
              </Link>
              {isSuperAdmin && (
                <button onClick={handleSeedData} className="quick-link seed-btn" style={{ background: 'var(--accent-glow)', border: '1px dashed var(--accent)', cursor: 'pointer' }}>
                  🌱 ลงข้อมูลตัวอย่าง (Seed)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Riders */}
        {tab === 'riders' && (
          <div className="admin-riders">
            {/* Pending applications */}
            {applications.length > 0 && (
              <div className="admin-section">
                <h2 className="admin-section-title">⏳ คำขอรอพิจารณา ({applications.length})</h2>
                {applications.map(app => (
                  <div key={app.id} className="application-card">
                    <div className="app-info">
                      <p className="app-name">{app.user?.name || 'ไม่ระบุ'}</p>
                      {app.note && <p className="app-note">📝 {app.note}</p>}
                      <p className="app-date">
                        {new Date(app.created_at).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                    <div className="app-actions">
                      <button
                        className="approve-btn"
                        onClick={() => handleApproveRider(app)}
                        disabled={actionLoading}
                      >
                        ✅ อนุมัติ
                      </button>
                      <button
                        className="reject-btn"
                        onClick={() => handleRejectRider(app)}
                        disabled={actionLoading}
                      >
                        ❌ ปฏิเสธ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active riders */}
            <div className="admin-section">
              <h2 className="admin-section-title">🛵 ไรเดอร์ทั้งหมด ({riders.length})</h2>
              {riders.length === 0 ? (
                <p className="empty-text">ยังไม่มีไรเดอร์</p>
              ) : (
                riders.map(rider => (
                  <div key={rider.id} className="rider-card">
                    <div className="rider-card-info">
                      <p className="rider-card-name">{rider.name}</p>
                      <p className="rider-card-phone">📞 {rider.phone || 'ไม่ระบุ'}</p>
                    </div>
                    <button
                      className="demote-btn"
                      onClick={() => handleDemoteRider(rider)}
                      disabled={actionLoading}
                    >
                      ปลดออก
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="admin-history">
            <h2 className="admin-section-title">📋 ประวัติออเดอร์ทั้งหมด</h2>
            {history.length === 0 ? (
              <p className="empty-text">ยังไม่มีออเดอร์</p>
            ) : (
              <div className="history-table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>ลูกค้า</th>
                      <th>ไรเดอร์</th>
                      <th>ที่อยู่</th>
                      <th>รวม</th>
                      <th>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(order => (
                      <tr key={order.id}>
                        <td>{new Date(order.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}</td>
                        <td>{order.customer?.name || '-'}</td>
                        <td>{order.rider?.name || '-'}</td>
                        <td className="address-cell">{order.delivery_address}</td>
                        <td>฿{order.total}</td>
                        <td>
                          <span className={`status-pill status-${order.status}`}>
                            {order.status === 1 ? 'รอ' : order.status === 2 ? 'รับแล้ว' : order.status === 3 ? 'ส่ง' : 'สำเร็จ'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Restaurants — link to existing admin */}
        {tab === 'restaurants' && (
          <div className="admin-section">
            <h2 className="admin-section-title">🍽️ จัดการร้านอาหาร</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              เพิ่ม แก้ไข หรือลบร้านอาหารและเมนูต่างๆ
            </p>
            {/* Embed existing restaurant management from original admin page */}
            <RestaurantManager />
          </div>
        )}

        {/* Admins (Super Admin only) */}
        {tab === 'admins' && isSuperAdmin && (
          <div className="admin-section">
            <h2 className="admin-section-title">👑 จัดการแอดมิน</h2>
            
            <div className="add-admin-form" style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
              <input
                type="tel"
                className="form-input"
                placeholder="ระบุเบอร์โทรศัพท์ที่ต้องการแต่งตั้ง..."
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                className="admin-btn" 
                onClick={handleAppointAdmin}
                disabled={actionLoading}
              >
                + แต่งตั้งแอดมิน
              </button>
            </div>

            <div className="admins-list">
              {admins.map(admin => (
                <div key={admin.id} className="admin-card">
                  <div>
                    <p className="admin-name">{admin.name}</p>
                    <p className="admin-badge">
                      {admin.is_super_admin ? '👑 Super Admin' : '⚙️ Admin'}
                    </p>
                  </div>
                  {!admin.is_super_admin && (
                    <button
                      className="demote-btn"
                      onClick={() => handleRemoveAdmin(admin)}
                      disabled={actionLoading}
                    >
                      ถอดถอน
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline restaurant manager component
function RestaurantManager() {
  return (
    <div>
      <Link href="/admin/restaurants" className="admin-btn">
        🍽️ ไปหน้าจัดการร้านอาหาร →
      </Link>
    </div>
  );
}

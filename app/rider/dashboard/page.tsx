'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Order } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RiderDashboard() {
  const { user, isRider, loading } = useAuth();
  const router = useRouter();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) router.push('/auth');
      else if (!isRider) router.push('/');
    }
  }, [loading, user, isRider, router]);

  const fetchOrders = async () => {
    if (!user) return;

    // Available orders (status=1, no rider)
    const { data: available } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 1)
      .is('rider_id', null)
      .order('created_at', { ascending: true });

    // My active orders
    const { data: mine } = await supabase
      .from('orders')
      .select('*')
      .eq('rider_id', user.id)
      .in('status', [2, 3])
      .order('created_at', { ascending: false });

    setAvailableOrders((available as Order[]) || []);
    setMyOrders((mine as Order[]) || []);
    setFetching(false);
  };

  useEffect(() => {
    if (!user || !isRider) return;
    fetchOrders();

    // Real-time: watch all order changes
    const channel = supabase
      .channel('rider-pool')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isRider]);

  const handleAccept = async (orderId: string) => {
    setAccepting(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ rider_id: user!.id, status: 2 })
      .eq('id', orderId)
      .eq('status', 1) // Prevent race condition
      .is('rider_id', null);

    if (!error) {
      router.push(`/orders/${orderId}`);
    } else {
      alert('ออเดอร์นี้ถูกรับไปแล้ว');
      fetchOrders();
    }
    setAccepting(null);
  };

  if (loading || fetching) return (
    <div className="page-loading"><div className="spinner" /><p>กำลังโหลด...</p></div>
  );

  return (
    <div className="rider-dashboard">
      <div className="container">
        <h1 className="page-title">📦 กองกลาง — ออเดอร์ที่รอรับ</h1>

        {/* My active orders */}
        {myOrders.length > 0 && (
          <div className="rider-section">
            <h2 className="rider-section-title">🔴 งานของฉัน (กำลังดำเนินการ)</h2>
            {myOrders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`} className="order-pool-card mine">
                <div className="pool-card-header">
                  <span className="pool-status">
                    {order.status === 2 ? '🛵 รอออกเดินทาง' : '📦 กำลังส่ง'}
                  </span>
                  <span className="pool-fee">รายได้: ฿{order.delivery_fee}</span>
                </div>
                <p className="pool-address">📍 {order.delivery_address}</p>
                <p className="pool-restaurant">🍽️ {order.restaurant_name}</p>
                <span className="pool-cta">จัดการงาน →</span>
              </Link>
            ))}
          </div>
        )}

        {/* Available orders */}
        <div className="rider-section">
          <h2 className="rider-section-title">
            🟢 ออเดอร์ที่รอรับ
            <span className="pool-count">({availableOrders.length})</span>
          </h2>

          {availableOrders.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">🎉</p>
              <p className="empty-text">ยังไม่มีออเดอร์ที่รอรับในขณะนี้</p>
            </div>
          ) : (
            availableOrders.map(order => (
              <div key={order.id} className="order-pool-card">
                <div className="pool-card-header">
                  <span className="pool-time">
                    ⏱️ {new Date(order.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    {order.queue_number && <span style={{ marginLeft: 8, background: '#eee', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>คิว {order.queue_number}</span>}
                  </span>
                  <span className="pool-fee" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>
                    +฿{order.delivery_fee} (ค่าส่ง)
                  </span>
                </div>
                <p className="pool-restaurant">🍽️ {order.restaurant_name}</p>
                <p className="pool-address">📍 {order.delivery_address}</p>
                
                {/* Breakdown */}
                <div className="pool-breakdown" style={{ marginTop: 12, padding: '10px', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ค่าอาหาร ({order.items.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น)</span>
                    <span>฿{order.subtotal}</span>
                  </div>
                  
                  {order.discount_percent ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>ค่าส่งปกติ</span>
                        <del style={{ color: 'var(--text-muted)' }}>฿{(order.delivery_fee / (1 - order.discount_percent / 100)).toFixed(0)}</del>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, color: 'green' }}>
                        <span>ส่วนลดลูกค้า ({order.discount_percent}%)</span>
                        <span>-฿{((order.delivery_fee / (1 - order.discount_percent / 100)) - order.delivery_fee).toFixed(0)}</span>
                      </div>
                    </>
                  ) : null}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', paddingTop: 8, borderTop: '1px solid #ddd', marginTop: 8 }}>
                    <span>เก็บเงินลูกค้าสุทธิ</span>
                    <span style={{ fontSize: '1.1rem' }}>฿{order.total}</span>
                  </div>
                </div>

                <button
                  className="accept-order-btn"
                  onClick={() => handleAccept(order.id)}
                  disabled={accepting === order.id}
                  style={{ marginTop: 16 }}
                >
                  {accepting === order.id ? '⏳ กำลังรับงาน...' : '✅ รับงานนี้'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

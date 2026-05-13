'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Order, ORDER_STATUS } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_COLORS: Record<number, string> = {
  1: 'status-waiting',
  2: 'status-accepted',
  3: 'status-delivering',
  4: 'status-done',
};

const STATUS_ICONS: Record<number, string> = {
  1: '⏳', 2: '🛵', 3: '📦', 4: '✅',
};

export default function MyOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/auth');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      setOrders((data as Order[]) || []);
      setFetching(false);
    };
    fetchOrders();

    // Real-time updates
    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'orders',
        filter: `customer_id=eq.${user.id}`,
      }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading || fetching) return (
    <div className="page-loading">
      <div className="spinner" />
      <p>กำลังโหลดออเดอร์...</p>
    </div>
  );

  return (
    <div className="orders-page">
      <div className="container">
        <h1 className="page-title">📋 ออเดอร์ของฉัน</h1>

        {orders.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">🛒</p>
            <p className="empty-text">ยังไม่มีออเดอร์</p>
            <Link href="/" className="empty-cta-btn">สั่งอาหารเลย</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <Link key={order.id} href={`/orders/${order.id}`} className="order-card">
                <div className="order-card-header">
                  <div className={`order-status-badge ${STATUS_COLORS[order.status]}`}>
                    {STATUS_ICONS[order.status]} {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]}
                  </div>
                  <span className="order-date">
                    {new Date(order.created_at).toLocaleDateString('th-TH', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="order-restaurant">{order.restaurant_name}</p>
                <p className="order-address">📍 {order.delivery_address}</p>
                <div className="order-card-footer">
                  <span className="order-total">฿{order.total}</span>
                  <span className="order-view">ดูรายละเอียด →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

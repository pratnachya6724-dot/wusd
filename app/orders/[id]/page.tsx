'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, GOOGLE_MAPS_KEY } from '@/lib/supabase';
import { Order, Profile } from '@/lib/types';
import ChatBox from '@/components/ChatBox';
import CallButton from '@/components/CallButton';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const STEPS = [
  { key: 1, label: 'ได้รับคำสั่งซื้อแล้ว', icon: '📥' },
  { key: 2, label: 'ไรเดอร์รับงานแล้ว', icon: '🛵' },
  { key: 3, label: 'กำลังจัดส่ง', icon: '📦' },
  { key: 4, label: 'ส่งสำเร็จแล้ว', icon: '✅' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [rider, setRider] = useState<Profile | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [chatExpired, setChatExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  // Maps
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const customerMarkerRef = useRef<google.maps.Marker | null>(null);
  const riderMarkerRef = useRef<google.maps.Marker | null>(null);

  const fetchOrder = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    if (data) {
      setOrder(data as Order);
      // Check chat expiry
      if (data.chat_expires_at) {
        setChatExpired(new Date(data.chat_expires_at) < new Date());
      }
      // Fetch rider profile
      if (data.rider_id) {
        const { data: riderData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.rider_id)
          .single();
        if (riderData) setRider(riderData as Profile);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!id) return;
    fetchOrder();

    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${id}`,
      }, (payload) => {
        // Real-time update map if rider lat/lng changes
        if (payload.new) {
          setOrder(payload.new as Order);
        } else {
          fetchOrder();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load Maps
  useEffect(() => {
    setOptions({
      key: GOOGLE_MAPS_KEY,
      v: 'weekly',
      libraries: ['places'],
    });
    importLibrary('maps').then(() => setMapReady(true)).catch(console.error);
  }, []);

  // Update Map Markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || !order) return;

    if (!mapInstanceRef.current) {
      const center = { lat: order.delivery_lat || 8.6415, lng: order.delivery_lng || 99.8970 };
      const map = new google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      mapInstanceRef.current = map;

      // Customer Marker
      if (order.delivery_lat && order.delivery_lng) {
        customerMarkerRef.current = new google.maps.Marker({
          position: { lat: order.delivery_lat, lng: order.delivery_lng },
          map,
          title: 'จุดส่งอาหาร (ลูกค้า)',
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
        });
      }

      // Rider Marker
      if (order.rider_lat && order.rider_lng) {
        riderMarkerRef.current = new google.maps.Marker({
          position: { lat: order.rider_lat, lng: order.rider_lng },
          map,
          title: 'ตำแหน่งไรเดอร์',
          icon: { url: 'http://maps.google.com/mapfiles/ms/icons/motorcycle.png' }
        });
      }
    } else {
      // Update rider marker if exists
      if (order.rider_lat && order.rider_lng) {
        const newPos = { lat: order.rider_lat, lng: order.rider_lng };
        if (!riderMarkerRef.current) {
          riderMarkerRef.current = new google.maps.Marker({
            position: newPos,
            map: mapInstanceRef.current,
            title: 'ตำแหน่งไรเดอร์',
            icon: { url: 'http://maps.google.com/mapfiles/ms/icons/motorcycle.png' }
          });
        } else {
          riderMarkerRef.current.setPosition(newPos);
        }
      }
    }
  }, [mapReady, order]);

  const isThisRider = user?.id === order?.rider_id;

  // Rider Geolocation Watcher
  useEffect(() => {
    if (!isThisRider || !order) return;
    if (order.status !== 2 && order.status !== 3) return; // Only track when accepted or delivering

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Update rider position in DB
        supabase.from('orders').update({
          rider_lat: latitude,
          rider_lng: longitude
        }).eq('id', order.id).then();
      },
      (err) => console.error('Watch position error:', err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isThisRider, order?.status, order?.id]);

  // Chat expiry timer
  useEffect(() => {
    if (!order?.chat_expires_at) return;
    const expiresAt = new Date(order.chat_expires_at).getTime();
    const now = Date.now();
    if (now >= expiresAt) { setChatExpired(true); return; }
    const timer = setTimeout(() => setChatExpired(true), expiresAt - now);
    return () => clearTimeout(timer);
  }, [order?.chat_expires_at]);

  const handleCustomerCancel = async () => {
    if (!order || order.status !== 1) return;
    setCancelling(true);
    await supabase.from('orders').delete().eq('id', order.id);
    router.push('/orders');
  };

  const handleRiderCancel = async () => {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    await supabase.from('orders').update({
      status: 1,
      rider_id: null,
      cancel_reason: cancelReason.trim(),
      cancelled_by: 'rider',
    }).eq('id', order!.id);

    await supabase.from('messages').insert({
      order_id: order!.id,
      sender_id: user!.id,
      content: `🚫 ไรเดอร์ยกเลิกงาน: ${cancelReason.trim()}`,
      message_type: 'system',
    });

    setShowCancelModal(false);
    setCancelling(false);
    fetchOrder();
  };

  const handleRiderUpdateStatus = async (newStatus: number) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', order!.id);
  };

  if (loading) return (
    <div className="page-loading"><div className="spinner" /><p>กำลังโหลด...</p></div>
  );
  if (!order) return (
    <div className="page-loading"><p>ไม่พบออเดอร์</p></div>
  );

  const isCustomer = user?.id === order.customer_id;
  const chatActive = order.status >= 2 && order.rider_id && !chatExpired;

  return (
    <div className="order-detail-page">
      <div className="container">
        <h1 className="page-title">ติดตามออเดอร์</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="order-id-text">#{order.id.slice(0, 8).toUpperCase()}</p>
          {order.queue_number && (
            <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: 20, fontWeight: 'bold' }}>
              คิวที่ {order.queue_number}
            </span>
          )}
        </div>

        {/* Status Steps */}
        <div className="status-steps">
          {STEPS.map((step, i) => (
            <div key={step.key} className={`step ${order.status >= step.key ? 'step-active' : ''} ${order.status === step.key ? 'step-current' : ''}`}>
              <div className="step-icon">{step.icon}</div>
              <div className="step-label">{step.label}</div>
              {i < STEPS.length - 1 && (
                <div className={`step-line ${order.status > step.key ? 'step-line-done' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Real-time Map */}
        <div className="detail-section">
          <h2 className="detail-section-title">📍 พิกัดการจัดส่ง</h2>
          <div className="map-container" style={{ height: 250 }}>
            <div ref={mapRef} className="map-frame" />
            {!mapReady && (
              <div className="map-loading">
                <div className="spinner" />
                <p>กำลังโหลดแผนที่...</p>
              </div>
            )}
          </div>
        </div>

        {/* Rider info */}
        {rider && (
          <div className="rider-info-card">
            <div className="rider-info-left">
              <div className="rider-avatar">
                {rider.avatar_url
                  ? <img src={rider.avatar_url} alt={rider.name || ''} />
                  : <span>{(rider.name || 'R').charAt(0).toUpperCase()}</span>
                }
              </div>
              <div>
                <p className="rider-name">{rider.name || 'ไรเดอร์'}</p>
                <p className="rider-label">🛵 ไรเดอร์ของคุณ</p>
              </div>
            </div>
            {rider.phone && (
              <CallButton phone={rider.phone} name={rider.name || 'ไรเดอร์'} orderId={order.id} />
            )}
          </div>
        )}

        {/* Order Items */}
        <div className="detail-section">
          <h2 className="detail-section-title">รายการอาหาร</h2>
          {order.items.map((item, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div className="detail-item-row">
                <span>×{item.quantity} {item.name}</span>
                <span>{item.price === 0 ? 'รอสรุปราคา' : `฿${item.price * item.quantity}`}</span>
              </div>
              {item.note && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginLeft: 24, marginTop: -4 }}>
                  📝 {item.note}
                </div>
              )}
            </div>
          ))}
          <div className="detail-totals">
            <div className="detail-total-row">
              <span>ค่าอาหาร</span><span>฿{order.subtotal}</span>
            </div>
            {order.discount_percent ? (
              <div className="detail-total-row">
                <span>ค่าส่ง (ลด {order.discount_percent}%)</span>
                <span>
                  <del style={{ color: 'var(--text-muted)', marginRight: 8 }}>
                    ฿{(order.delivery_fee / (1 - order.discount_percent / 100)).toFixed(0)}
                  </del>
                  ฿{order.delivery_fee}
                </span>
              </div>
            ) : (
              <div className="detail-total-row">
                <span>ค่าส่ง</span><span>฿{order.delivery_fee}</span>
              </div>
            )}
            <div className="detail-total-row detail-total-final">
              <span>รวม</span><span>฿{order.total}</span>
            </div>
          </div>
          <p className="payment-note">💵 ชำระเงินกับไรเดอร์โดยตรง</p>
        </div>

        {/* Delivery address */}
        <div className="detail-section">
          <h2 className="detail-section-title">ที่อยู่จัดส่ง</h2>
          <p className="detail-address">📍 {order.delivery_address}</p>
          {order.note && <p className="detail-note">📝 {order.note}</p>}
        </div>

        {/* Cancellation notice */}
        {order.cancel_reason && order.cancelled_by === 'rider' && (
          <div className="cancel-notice">
            <p>🚫 ไรเดอร์ยกเลิกงาน: <strong>{order.cancel_reason}</strong></p>
          </div>
        )}

        {/* Chat */}
        {chatActive && user && (
          <div className="detail-section">
            <h2 className="detail-section-title">💬 แชตกับไรเดอร์</h2>
            <ChatBox orderId={order.id} userId={user.id} />
          </div>
        )}
        {chatExpired && order.status === 4 && (
          <div className="chat-expired-notice">
            💬 แชตหมดอายุแล้ว (30 นาทีหลังส่งสำเร็จ)
          </div>
        )}

        {/* Customer: Cancel button (status=1 only) */}
        {isCustomer && order.status === 1 && (
          <button
            className="cancel-btn"
            onClick={handleCustomerCancel}
            disabled={cancelling}
          >
            {cancelling ? 'กำลังยกเลิก...' : '❌ ยกเลิกออเดอร์'}
          </button>
        )}

        {/* Rider actions */}
        {isThisRider && (
          <div className="rider-actions">
            {order.status === 2 && (
              <button className="rider-action-btn" onClick={() => handleRiderUpdateStatus(3)}>
                🚴 ออกเดินทางแล้ว
              </button>
            )}
            {order.status === 3 && (
              <button className="rider-action-btn success" onClick={() => handleRiderUpdateStatus(4)}>
                ✅ ยืนยันส่งสำเร็จ
              </button>
            )}
            <button className="cancel-btn" onClick={() => setShowCancelModal(true)}>
              ❌ ยกเลิกงาน
            </button>
          </div>
        )}

        {/* Rider cancel modal */}
        {showCancelModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h3>ยืนยันการยกเลิกงาน</h3>
              <p>กรุณาระบุเหตุผลการยกเลิก</p>
              <textarea
                className="form-textarea"
                placeholder="เหตุผล เช่น มีเหตุฉุกเฉิน..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={3}
              />
              <div className="modal-actions">
                <button onClick={() => setShowCancelModal(false)} className="modal-cancel-btn">
                  ปิด
                </button>
                <button
                  onClick={handleRiderCancel}
                  disabled={!cancelReason.trim() || cancelling}
                  className="modal-confirm-btn"
                >
                  {cancelling ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิก'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

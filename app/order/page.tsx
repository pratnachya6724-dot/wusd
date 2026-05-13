'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { supabase, calculateDistance, calcItemBasedFee, DEFAULT_RESTAURANT_LAT, DEFAULT_RESTAURANT_LNG, GOOGLE_MAPS_KEY } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

// --- Queue & Discount Logic ---
// 08:00 - 11:30 : Queue + Discount
// 11:31 - 13:00 : Direct Order (No Discount)
// 13:00 - 17:00 : Queue + Discount
// 17:01 - 21:00 : Direct Order (No Discount)

function isDiscountTime(date: Date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const time = h + m / 60;
  if (time >= 8 && time <= 11.5) return true;
  if (time >= 13 && time <= 17) return true;
  return false;
}

function getRandomDiscount() {
  const rand = Math.random() * 100;
  // 50% (5%), 40% (10%), 30% (20%), 20% (30%), 10% (35%) - Adjust weights as needed
  if (rand < 5) return 50;
  if (rand < 15) return 40;
  if (rand < 35) return 30;
  if (rand < 65) return 20;
  return 10;
}

export default function OrderPage() {
  const { user, profile } = useAuth();
  const { items, subtotal, totalItems, clearCart } = useCart();
  const router = useRouter();

  const [address, setAddress] = useState(profile?.address || '');
  const [note, setNote] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  
  // New State variables
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [locating, setLocating] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [mapReady, setMapReady] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  // Set initial delivery fee based on items
  useEffect(() => {
    setDeliveryFee(calcItemBasedFee(totalItems));
  }, [totalItems]);

  // Redirect if not logged in or empty cart
  useEffect(() => {
    if (!user) { router.push('/auth'); return; }
    if (items.length === 0) { router.push('/cart'); return; }
  }, [user, items, router]);

  // Load Google Maps
  useEffect(() => {
    setOptions({
      key: GOOGLE_MAPS_KEY,
      v: 'weekly',
      libraries: ['places'],
    });

    importLibrary('maps').then(() => {
      setMapReady(true);
    }).catch((err: Error) => {
      console.error('Maps load error:', err);
    });
  }, []);

  // Handle location update
  const handleLocationUpdate = useCallback((newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    const dist = calculateDistance(DEFAULT_RESTAURANT_LAT, DEFAULT_RESTAURANT_LNG, newLat, newLng);
    setDistanceKm(dist);
    if (dist > 10) {
      setError('ขออภัยค่ะ จุดจัดส่งอยู่ห่างเกิน 10 กิโลเมตรจากศูนย์อาหาร ม.วลัยลักษณ์ ไม่สามารถจัดส่งได้');
    } else {
      setError('');
    }
  }, []);

  // Init map once loaded
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const defaultCenter = { lat: DEFAULT_RESTAURANT_LAT, lng: DEFAULT_RESTAURANT_LNG };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstanceRef.current = map;

    const marker = new google.maps.Marker({
      position: defaultCenter,
      map,
      draggable: true,
      title: 'ตำแหน่งจัดส่ง (ลากเพื่อเปลี่ยน)',
      animation: google.maps.Animation.DROP,
    });
    markerRef.current = marker;

    // Click on map moves marker
    map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        marker.setPosition(e.latLng);
        handleLocationUpdate(e.latLng.lat(), e.latLng.lng());
      }
    });

    // Drag end
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (pos) {
        handleLocationUpdate(pos.lat(), pos.lng());
      }
    });

  }, [mapReady, handleLocationUpdate]);

  // Get current location
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        handleLocationUpdate(latitude, longitude);

        if (mapInstanceRef.current && markerRef.current) {
          const latlng = { lat: latitude, lng: longitude };
          mapInstanceRef.current.panTo(latlng);
          mapInstanceRef.current.setZoom(16);
          markerRef.current.setPosition(latlng);
        }
        setLocating(false);
      },
      () => {
        setError('ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาต GPS');
        setLocating(false);
      }
    );
  }, [handleLocationUpdate]);

  const handlePlaceOrder = async () => {
    if (!address.trim()) { setError('กรุณาใส่ที่อยู่จัดส่ง'); return; }
    if (!lat || !lng) { setError('กรุณาเลือกตำแหน่งจัดส่งบนแผนที่'); return; }
    if (distanceKm !== null && distanceKm > 10) { setError('ไม่สามารถสั่งได้ เนื่องจากเกินระยะทาง 10 กม.'); return; }
    if (!user) return;

    setPlacing(true);
    setError('');

    const restaurantName = items[0]?.restaurantName || '';
    
    // Check Queue and Discount logic based on current time
    const now = new Date();
    const hasDiscount = isDiscountTime(now);
    let finalDiscountPercent = 0;
    if (hasDiscount) {
      finalDiscountPercent = getRandomDiscount();
    }
    
    // Delivery fee math
    const actualDeliveryFee = deliveryFee;
    const finalDeliveryFee = hasDiscount ? actualDeliveryFee * (1 - finalDiscountPercent / 100) : actualDeliveryFee;
    const total = subtotal + finalDeliveryFee;

    // Calculate queue number: Just count today's orders
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());
    
    const queueNumber = (count || 0) + 1;

    const { data, error: insertError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.id,
        items: items,
        subtotal,
        delivery_fee: finalDeliveryFee, 
        total,
        delivery_address: address.trim(),
        delivery_lat: lat,
        delivery_lng: lng,
        restaurant_name: restaurantName,
        note: note.trim() || null,
        status: 1,
        queue_number: queueNumber,
        discount_percent: finalDiscountPercent
      })
      .select('id')
      .single();

    if (insertError || !data) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      setPlacing(false);
      return;
    }

    clearCart();
    router.push(`/orders/${data.id}`);
  };

  if (!user || items.length === 0) return null;

  // Real-time calculation for display
  const now = new Date();
  const hasDiscountRound = isDiscountTime(now);
  const total = subtotal + deliveryFee;

  return (
    <div className="order-page">
      <div className="order-container">
        <h1 className="order-title">📍 ยืนยันออเดอร์</h1>

        <div className="order-grid">
          {/* Left: Address + Map */}
          <div className="order-left">
            <div className="order-section">
              <h2 className="order-section-title">ที่อยู่จัดส่ง</h2>

              <textarea
                className="form-textarea"
                placeholder="ที่อยู่หอพัก ชั้น ห้อง..."
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
              />

              <button
                type="button"
                className="location-btn"
                onClick={handleGetLocation}
                disabled={locating}
              >
                {locating ? '⏳ กำลังดึงตำแหน่ง...' : '📌 ใช้ตำแหน่งปัจจุบัน'}
              </button>

              {/* Google Map */}
              <div className="map-container">
                <div ref={mapRef} className="map-frame" />
                {!mapReady && (
                  <div className="map-loading">
                    <div className="spinner" />
                    <p>กำลังโหลดแผนที่...</p>
                  </div>
                )}
              </div>

              {lat && lng && (
                <p className="location-coords">
                  📍 ระยะทาง: {distanceKm ? distanceKm.toFixed(2) : '-'} กม.
                </p>
              )}
            </div>

            <div className="order-section">
              <h2 className="order-section-title">หมายเหตุ (ไม่บังคับ)</h2>
              <textarea
                className="form-textarea"
                placeholder="เช่น ไม่เผ็ด, ไม่ใส่ผักชี..."
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Right: Summary */}
          <div className="order-right">
            <div className="order-summary">
              <h2 className="order-section-title">สรุปออเดอร์</h2>

              <div className="order-items-list">
                {items.map(item => (
                  <div key={item.itemId} className="order-item-row">
                    <div className="order-item-info">
                      <span className="order-item-qty">×{item.quantity}</span>
                      <span className="order-item-name">{item.name}</span>
                    </div>
                    <span className="order-item-price">฿{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div className="order-totals">
                <div className="total-row">
                  <span>ราคาอาหาร</span>
                  <span>฿{subtotal}</span>
                </div>
                <div className="total-row">
                  <span>ค่าส่ง (ชิ้นแรก 10฿ ชิ้นถัดไป 5฿)</span>
                  <span>฿{deliveryFee}</span>
                </div>
                {hasDiscountRound && (
                  <div className="total-row discount-row" style={{ color: 'green', fontSize: '0.9rem' }}>
                    <span>🎁 รอบจองคิว! ลุ้นรับส่วนลดค่าส่ง</span>
                    <span>10% - 50%</span>
                  </div>
                )}
                <div className="total-row total-final">
                  <span>รวมทั้งหมด (ก่อนหักส่วนลด)</span>
                  <span>฿{total}</span>
                </div>
              </div>

              <p className="payment-note">💵 ชำระเงินกับไรเดอร์โดยตรง</p>

              {error && <p className="auth-error">❌ {error}</p>}

              <button
                className="place-order-btn"
                onClick={handlePlaceOrder}
                disabled={placing || (distanceKm !== null && distanceKm > 10)}
                style={distanceKm !== null && distanceKm > 10 ? { backgroundColor: '#ccc', cursor: 'not-allowed' } : {}}
              >
                {placing ? '⏳ กำลังสั่ง...' : '✅ ยืนยันสั่งออเดอร์'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

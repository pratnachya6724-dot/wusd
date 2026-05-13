'use client';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { items, removeItem, updateQty, totalItems, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>ตะกร้าของคุณว่างอยู่</h3>
          <p style={{ marginBottom: 24 }}>เริ่มเพิ่มเมนูที่ชอบได้เลย!</p>
          <Link href="/" className="btn btn-primary">เลือกอาหาร</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="page-header">
        <h1>ตะกร้าสินค้า</h1>
        <p>{totalItems} รายการ</p>
      </div>

      <div className="cart-layout">
        {/* Items */}
        <div>
          {items.map(item => (
            <div key={item.itemId} className="cart-item">
              <img src={item.image} alt={item.name} className="cart-item-img" />
              <div className="cart-item-info">
                <p className="cart-item-name">{item.name}</p>
                {item.note && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: 2 }}>📝 {item.note}</p>
                )}
                <p className="cart-item-from">จาก {item.restaurantName}</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQty(item.itemId, item.quantity - 1)}>−</button>
                    <span className="qty-num">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.itemId, item.quantity + 1)}>+</button>
                  </div>
                  <span className="cart-item-price">
                    {item.price === 0 ? 'รอสรุปราคา' : `฿${item.price * item.quantity}`}
                  </span>
                </div>
              </div>
              <button
                className="cart-remove"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => removeItem(item.itemId)}
                aria-label="ลบรายการ"
              >✕</button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="order-summary">
          <h3>สรุปคำสั่งซื้อ</h3>
          <div className="summary-row">
            <span style={{ color: 'var(--text-secondary)' }}>ราคาอาหาร</span>
            <span>฿{subtotal}</span>
          </div>
          <div className="summary-row">
            <span style={{ color: 'var(--text-secondary)' }}>ค่าส่ง</span>
            <span style={{ color: 'var(--text-muted)' }}>คำนวณในหน้าถัดไป</span>
          </div>
          <div className="summary-row summary-total">
            <span>รวมค่าอาหาร</span>
            <span>฿{subtotal}</span>
          </div>
          <Link href="/order">
            <button className="checkout-btn" id="proceed-to-checkout">ไปหน้าสั่งอาหาร →</button>
          </Link>
          <Link href="/" style={{ display: 'block', textAlign: 'center', marginTop: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            + เพิ่มรายการ
          </Link>
        </div>
      </div>
    </div>
  );
}

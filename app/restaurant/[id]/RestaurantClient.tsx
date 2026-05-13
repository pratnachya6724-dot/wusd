'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRestaurants } from '@/context/RestaurantContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

export default function RestaurantClient({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { restaurants } = useRestaurants();
  const restaurant = restaurants.find(r => r.id === id);
  const { addItem } = useCart();
  const [toast, setToast] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [note, setNote] = useState('');

  if (!restaurant) return (
    <div className="container">
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <div className="empty-state-icon">🏪</div>
        <h3>ไม่พบร้านนี้</h3>
        <button onClick={() => router.back()} className="btn btn-primary" style={{ marginTop: 16 }}>กลับหน้าหลัก</button>
      </div>
    </div>
  );

  const menuCategories = ['ทั้งหมด', ...Array.from(new Set(restaurant.menu.map(m => m.category)))];
  const filtered = activeCategory === 'ทั้งหมด' ? restaurant.menu : restaurant.menu.filter(m => m.category === activeCategory);

  const showToast = (name: string) => {
    setToast(`✅ เพิ่ม "${name}" แล้ว`);
    setTimeout(() => setToast(''), 2500);
  };

  const openAddModal = (item: any) => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setSelectedItem(item);
    setNote('');
  };

  const handleConfirmAdd = () => {
    if (!selectedItem) return;
    addItem({ 
      restaurantId: restaurant.id, 
      restaurantName: restaurant.name, 
      itemId: selectedItem.id, 
      name: selectedItem.name, 
      price: selectedItem.price, 
      quantity: 1, 
      image: selectedItem.image,
      note: note.trim() || undefined
    });
    showToast(selectedItem.name);
    setSelectedItem(null);
    setNote('');
  };

  const handleCustomOrder = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setSelectedItem({
      id: `custom-${Date.now()}`,
      name: 'สั่งเมนูตามใจ (ระบุเอง)',
      description: 'กรุณาระบุรายละเอียดอาหารที่คุณต้องการสั่งจากร้านนี้อย่างชัดเจน',
      price: 0,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=300&q=80',
      isCustom: true
    });
    setNote('');
  };

  return (
    <div>
      <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
        <img src={restaurant.image} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.3) 60%, transparent 100%)' }} />
        
        <button 
          onClick={() => router.back()} 
          style={{ position: 'absolute', top: 24, left: 24, background: 'rgba(0,0,0,0.5)', color: '#fff', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(4px)' }}
        >
          ← ย้อนกลับ
        </button>

        <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
          <div className="breadcrumb"><Link href="/">หน้าแรก</Link> / <span>{restaurant.name}</span></div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: 8 }}>{restaurant.name}</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>{restaurant.description}</p>
          <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
            <span className="rating">⭐ {restaurant.rating} ({restaurant.reviewCount})</span>
            <span>🕐 {restaurant.deliveryTime} นาที</span>
            <span>🛵 ค่าส่งเริ่มต้น ฿10</span>
            <span>🍽️ สั่งขั้นต่ำ ฿{restaurant.minOrder}</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
        
        {/* Custom Order Card */}
        <div className="restaurant-card" onClick={handleCustomOrder} style={{ marginBottom: 32, border: '2px dashed var(--accent)', background: 'var(--accent-glow)' }}>
          <div className="restaurant-card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '2.5rem' }}>✏️</div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>สั่งเมนูตามใจ (พิมพ์สั่งเอง)</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                อยากกินเมนูไหนที่ไม่มีในรายการ? หรือสั่งข้าวราดแกงหลายอย่าง? กดที่นี่แล้วพิมพ์สั่งได้เลยครับ ไรเดอร์จะซื้อให้ตามสั่ง! (จ่ายค่าอาหารตามจริงหน้างาน)
              </p>
            </div>
          </div>
        </div>

        <div className="category-pills" style={{ marginTop: 0 }}>
          {menuCategories.map(cat => (
            <button key={cat} className={`pill${activeCategory === cat ? ' active' : ''}`} onClick={() => setActiveCategory(cat)}>{cat}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">🍽️</div><h3>ยังไม่มีเมนูในหมวดนี้</h3></div>
        ) : (
          <div className="cards-grid">
            {filtered.map(item => (
              <div key={item.id} className="restaurant-card">
                <div style={{ position: 'relative' }}>
                  <img src={item.image} alt={item.name} className="restaurant-card-img" />
                  {item.popular && <span className="popular-badge" style={{ position: 'absolute', top: 10, left: 10 }}>🔥 ยอดนิยม</span>}
                </div>
                <div className="restaurant-card-body">
                  <p className="restaurant-card-name">{item.name}</p>
                  <p className="restaurant-card-desc">{item.description}</p>
                  <div className="menu-card-footer" style={{ marginTop: 12 }}>
                    <span className="menu-price">฿{item.price}</span>
                    <button className="add-btn" onClick={() => openAddModal(item)} id={`add-${item.id}`} aria-label={`เพิ่ม ${item.name}`}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && <div className="toast success">{toast}</div>}

      {/* Add Item Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">สั่ง {selectedItem.name}</h3>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <img src={selectedItem.image} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '8px' }} />
              <div>
                <h4 style={{ fontWeight: 700 }}>{selectedItem.name}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{selectedItem.description}</p>
                <div style={{ color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}>
                  {selectedItem.price > 0 ? `฿${selectedItem.price}` : '฿ จ่ายตามจริงหน้างาน'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                {selectedItem.isCustom ? 'รายการที่ต้องการสั่ง (พิมพ์รายละเอียดให้ชัดเจน)' : 'รายละเอียดเพิ่มเติม (เช่น ไม่เผ็ด, ราดแกงอะไร)'}
              </label>
              <textarea 
                className="form-input" 
                rows={4} 
                placeholder={selectedItem.isCustom ? "เช่น ข้าวราดแกงเขียวหวานไก่ 1 กล่อง และ พะแนงหมู 1 ถุง" : "ตัวเลือกเพิ่มเติม..."}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                autoFocus
              />
              {selectedItem.isCustom && note.trim().length === 0 && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 8 }}>* กรุณาระบุรายการอาหารที่ต้องการสั่ง</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setSelectedItem(null)}>ยกเลิก</button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmAdd}
                disabled={selectedItem.isCustom && note.trim().length === 0}
              >
                เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useRestaurants } from '@/context/RestaurantContext';
import { Restaurant, MenuItem } from '@/lib/data';

export default function RestaurantAdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { restaurants, addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem } = useRestaurants();
  const router = useRouter();

  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [editingItem, setEditingItem] = useState<{ restaurantId: string; item: MenuItem } | null>(null);
  const [showResModal, setShowResModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);

  const [resForm, setResForm] = useState({
    name: '', description: '', image: '', category: 'อาหารไทย', minOrder: 50, deliveryTime: '20-30', tags: ''
  });

  const [itemForm, setItemForm] = useState({
    name: '', description: '', price: 0, image: '', category: 'อาหารหลัก', popular: false
  });

  if (authLoading) return <div className="page-loading"><div className="spinner" /></div>;
  if (!isAdmin) { router.push('/'); return null; }

  const handleOpenResModal = (res?: Restaurant) => {
    if (res) {
      setEditingRestaurant(res);
      setResForm({
        name: res.name,
        description: res.description,
        image: res.image,
        category: res.category,
        minOrder: res.minOrder,
        deliveryTime: res.deliveryTime,
        tags: res.tags.join(', ')
      });
    } else {
      setEditingRestaurant(null);
      setResForm({ name: '', description: '', image: '', category: 'อาหารไทย', minOrder: 50, deliveryTime: '20-30', tags: '' });
    }
    setShowResModal(true);
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...resForm,
      tags: resForm.tags.split(',').map(t => t.trim()).filter(t => t),
      rating: editingRestaurant?.rating || 4.5,
      reviewCount: editingRestaurant?.reviewCount || 0
    };

    try {
      if (editingRestaurant) {
        await updateRestaurant(editingRestaurant.id, {
          ...data
        });
      } else {
        await addRestaurant({
          ...data,
          menu: [] // New restaurant starts with empty menu
        });
      }
      setShowResModal(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleOpenItemModal = (resId: string, item?: MenuItem) => {
    setSelectedResId(resId);
    if (item) {
      setEditingItem({ restaurantId: resId, item });
      setItemForm({
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        category: item.category,
        popular: item.popular || false
      });
    } else {
      setEditingItem(null);
      setItemForm({ name: '', description: '', price: 0, image: '', category: 'อาหารหลัก', popular: false });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return;
    try {
      if (editingItem) {
        await updateMenuItem(selectedResId, editingItem.item.id, itemForm);
      } else {
        await addMenuItem(selectedResId, itemForm);
      }
      setShowItemModal(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteRes = async (id: string) => {
    if (confirm('ยืนยันการลบร้านอาหารและเมนูทั้งหมดในร้านนี้?')) {
      await deleteRestaurant(id);
    }
  };

  const handleDeleteItem = async (resId: string, itemId: string) => {
    if (confirm('ยืนยันการลบเมนูนี้?')) {
      await deleteMenuItem(resId, itemId);
    }
  };

  return (
    <div className="admin-page" style={{ paddingBottom: 100 }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <h1 className="page-title">🍽️ จัดการร้านอาหาร</h1>
          <button className="btn btn-primary" onClick={() => handleOpenResModal()}>+ เพิ่มร้านอาหาร</button>
        </div>

        {restaurants.length === 0 && (
          <div className="empty-state">
            <p>ยังไม่มีร้านอาหารในระบบ</p>
            <button className="btn btn-ghost" onClick={() => handleOpenResModal()}>เริ่มเพิ่มร้านแรก</button>
          </div>
        )}

        <div className="res-admin-list">
          {restaurants.map(res => (
            <div key={res.id} className="res-admin-card" style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, marginBottom: 32, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                <img src={res.image} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>{res.name}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 12 }}>{res.description}</p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-ghost" onClick={() => handleOpenResModal(res)}>📝 แก้ไขข้อมูลร้าน</button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRes(res.id)}>🗑️ ลบร้าน</button>
                  </div>
                </div>
              </div>

              {/* Menu Section */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 700 }}>📋 เมนูอาหาร ({res.menu.length})</h3>
                  <button className="btn btn-sm btn-accent" onClick={() => handleOpenItemModal(res.id)}>+ เพิ่มเมนู</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {res.menu.map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <img src={item.image} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.name} {item.popular && '🔥'}</p>
                        <p style={{ color: 'var(--accent)', fontWeight: 700 }}>฿{item.price}</p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleOpenItemModal(res.id, item)}>แก้ไข</button>
                          <button style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => handleDeleteItem(res.id, item.id)}>ลบ</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restaurant Modal */}
      {showResModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 600 }}>
            <h2 style={{ marginBottom: 20 }}>{editingRestaurant ? 'แก้ไขร้านอาหาร' : 'เพิ่มร้านอาหารใหม่'}</h2>
            <form onSubmit={handleSaveRestaurant}>
              <div className="form-group">
                <label>ชื่อร้าน</label>
                <input className="form-input" required value={resForm.name} onChange={e => setResForm({...resForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>คำอธิบาย</label>
                <textarea className="form-input" rows={2} value={resForm.description} onChange={e => setResForm({...resForm, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>URL รูปภาพร้าน</label>
                <input className="form-input" placeholder="https://..." value={resForm.image} onChange={e => setResForm({...resForm, image: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group">
                  <label>หมวดหมู่</label>
                  <select className="form-input" value={resForm.category} onChange={e => setResForm({...resForm, category: e.target.value})}>
                    <option>อาหารไทย</option>
                    <option>อาหารอีสาน</option>
                    <option>อาหารญี่ปุ่น</option>
                    <option>ก๋วยเตี๋ยว</option>
                    <option>ของหวาน/เครื่องดื่ม</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>สั่งขั้นต่ำ (บาท)</label>
                  <input type="number" className="form-input" value={resForm.minOrder} onChange={e => setResForm({...resForm, minOrder: Number(e.target.value)})} />
                </div>
              </div>
              <div className="form-group">
                <label>แท็ก (คั่นด้วยคอมม่า)</label>
                <input className="form-input" placeholder="เผ็ด, แซ่บ, ราคาถูก" value={resForm.tags} onChange={e => setResForm({...resForm, tags: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowResModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 500 }}>
            <h2 style={{ marginBottom: 20 }}>{editingItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</h2>
            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label>ชื่อเมนู</label>
                <input className="form-input" required value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>ราคา (บาท)</label>
                <input type="number" className="form-input" required value={itemForm.price} onChange={e => setItemForm({...itemForm, price: Number(e.target.value)})} />
              </div>
              <div className="form-group">
                <label>คำอธิบายเมนู</label>
                <textarea className="form-input" rows={2} value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>URL รูปภาพเมนู</label>
                <input className="form-input" placeholder="https://..." value={itemForm.image} onChange={e => setItemForm({...itemForm, image: e.target.value})} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" id="popular" checked={itemForm.popular} onChange={e => setItemForm({...itemForm, popular: e.target.checked})} />
                <label htmlFor="popular" style={{ marginBottom: 0 }}>เมนูยอดนิยม 🔥</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowItemModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary">บันทึกเมนู</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

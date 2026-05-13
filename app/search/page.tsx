'use client';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRestaurants } from '@/context/RestaurantContext';
import { useCart } from '@/context/CartContext';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const [search, setSearch] = useState(query);
  const [toast, setToast] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { searchItems, autocompleteSuggestions } = useRestaurants();
  const { addItem } = useCart();

  const results = query ? searchItems(query) : [];
  const suggestions = search.trim().length >= 1 ? autocompleteSuggestions(search.trim()).slice(0, 10) : [];

  useEffect(() => { setSearch(query); }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleAdd = (restaurantId: string, restaurantName: string, item: { id: string; name: string; price: number; image: string }) => {
    addItem({ restaurantId, restaurantName, itemId: item.id, name: item.name, price: item.price, quantity: 1, image: item.image });
    showToast(`✅ เพิ่ม "${item.name}" ในตะกร้าแล้ว`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) { setShowDropdown(false); router.push(`/search?q=${encodeURIComponent(search.trim())}`); }
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <form onSubmit={handleSearch} className="search-wrapper" style={{ maxWidth: '100%', marginBottom: 32, position: 'relative' }}>
        <span className="search-icon">🔍</span>
        <input
          id="search-input"
          ref={inputRef}
          className="search-bar"
          placeholder="ค้นหาเมนูอาหาร..."
          value={search}
          autoComplete="off"
          onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
          onFocus={() => search.trim().length >= 1 && setShowDropdown(true)}
        />
        <button type="submit" className="search-btn">ค้นหา</button>

        {showDropdown && suggestions.length > 0 && (
          <div ref={dropdownRef} className="autocomplete-dropdown">
            {suggestions.map(({ restaurant, item }) => (
              <div key={item.id} className="autocomplete-item"
                onMouseDown={() => { setSearch(item.name); setShowDropdown(false); router.push(`/search?q=${encodeURIComponent(item.name)}`); }}>
                <img src={item.image} alt={item.name} className="autocomplete-img" />
                <div className="autocomplete-text">
                  <p className="autocomplete-name">{item.name}</p>
                  <p className="autocomplete-from">📍 {restaurant.name} · ฿{item.price}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </form>

      {query && (
        <p className="section-title">
          ผลการค้นหา "{query}"
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.875rem', marginLeft: 8 }}>({results.length} รายการ)</span>
        </p>
      )}

      {results.length === 0 && query && (
        <div className="empty-state">
          <div className="empty-state-icon">🍽️</div>
          <h3>ไม่พบเมนูที่ค้นหา</h3>
          <p>ลองค้นหาด้วยคำอื่น</p>
        </div>
      )}

      {!query && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>พิมพ์ชื่อเมนูที่ต้องการ</h3>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {results.map(({ restaurant, item }) => (
          <div key={`${restaurant.id}-${item.id}`} className="search-result-card">
            <img src={item.image} alt={item.name} className="search-result-img" />
            <div style={{ flex: 1 }}>
              <p className="search-from">📍 {restaurant.name}</p>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>{item.name}</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{item.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1rem' }}>฿{item.price}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/restaurant/${restaurant.id}`} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>ดูร้าน</Link>
                  <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 14px' }}
                    onClick={() => handleAdd(restaurant.id, restaurant.name, item)}>
                    + ใส่ตะกร้า
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {toast && <div className="toast success">{toast}</div>}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="container" style={{ paddingTop: 32 }}>กำลังโหลด...</div>}>
      <SearchResults />
    </Suspense>
  );
}

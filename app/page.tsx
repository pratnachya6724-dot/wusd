'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRestaurants } from '@/context/RestaurantContext';
import { useAuth } from '@/context/AuthContext';
import AdminLoginModal from '@/components/AdminLoginModal';

const ADMIN_CODE = 'NNN1';

export default function HomePage() {
  const { restaurants, autocompleteSuggestions } = useRestaurants();
  const { isAdmin, needsOnboarding, loading } = useAuth();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Redirect to onboarding if needed
  useEffect(() => {
    if (!loading && needsOnboarding) {
      router.push('/onboarding');
    }
  }, [loading, needsOnboarding, router]);

  const suggestions = query.trim().length >= 1
    ? autocompleteSuggestions(query.trim()).slice(0, 10)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    if (trimmed.toUpperCase() === ADMIN_CODE) {
      if (isAdmin) {
        router.push('/admin');
      } else {
        setShowLoginModal(true);
      }
      setQuery('');
      return;
    }
    setShowDropdown(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestionClick = (item: { restaurant: { id: string; name: string }; item: { name: string } }) => {
    setShowDropdown(false);
    setQuery(item.item.name);
    router.push(`/search?q=${encodeURIComponent(item.item.name)}`);
  };

  const filtered = activeCategory === 'ทั้งหมด'
    ? restaurants
    : restaurants.filter(r => r.category === activeCategory);

  const allCategories = ['ทั้งหมด', ...Array.from(new Set(restaurants.map(r => r.category)))];

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">
          หาอาหารที่ใช่<br />ใน <span>WUS</span> ที่เดียว
        </h1>
        <p className="hero-subtitle">
          ค้นหาเมนูจาก {restaurants.length}+ ร้านดัง ส่งถึงหอทุกที่
        </p>

        <form className="search-wrapper" onSubmit={handleSearch} style={{ position: 'relative' }}>
          <span className="search-icon">🔍</span>
          <input
            id="main-search"
            ref={inputRef}
            className="search-bar"
            placeholder="ค้นหาเมนู เช่น ราเมน, พิซซ่า, ข้าวมันไก่..."
            value={query}
            autoComplete="off"
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => query.trim().length >= 1 && setShowDropdown(true)}
          />
          <button type="submit" className="search-btn">ค้นหา</button>

          {showDropdown && suggestions.length > 0 && (
            <div ref={dropdownRef} className="autocomplete-dropdown">
              {suggestions.map(({ restaurant, item }) => (
                <div
                  key={item.id}
                  className="autocomplete-item"
                  onMouseDown={() => handleSuggestionClick({ restaurant, item })}
                >
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
      </section>

      {/* Restaurant list */}
      <div className="container" style={{ paddingBottom: 64 }}>
        <div className="category-pills">
          {allCategories.map(cat => (
            <button
              key={cat}
              className={`pill${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="section-title">
          {activeCategory === 'ทั้งหมด' ? 'ร้านอาหารทั้งหมด' : activeCategory}
          <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.875rem', marginLeft: 8 }}>
            ({filtered.length} ร้าน)
          </span>
        </p>

        <div className="cards-grid">
          {filtered.map(r => (
            <Link key={r.id} href={`/restaurant/${r.id}`}>
              <div className="restaurant-card">
                <img src={r.image} alt={r.name} className="restaurant-card-img" />
                <div className="restaurant-card-body">
                  <p className="restaurant-card-name">{r.name}</p>
                  <p className="restaurant-card-desc">{r.description}</p>
                  <div className="restaurant-card-meta">
                    <span className="rating">⭐ {r.rating}</span>
                    <span>({r.reviewCount})</span>
                    <span>🕐 {r.deliveryTime} นาที</span>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {r.tags.slice(0, 3).map(t => (
                      <span key={t} className="tag-badge">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {showLoginModal && (
        <AdminLoginModal
          onSuccess={() => { setShowLoginModal(false); router.push('/admin'); }}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </>
  );
}

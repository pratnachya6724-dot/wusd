'use client';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, profile, isAdmin, isRider, signOut, loading } = useAuth();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    router.push('/');
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'ผู้ใช้';

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">
        🛵 WUS Delivery
      </Link>

      <div className="navbar-actions">
        {/* Cart — visible to customers and guests */}
        {!isAdmin && !isRider && (
          <Link href="/cart" className="cart-btn">
            🛒 ตะกร้า
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
        )}

        {loading ? (
          <div className="nav-loading" />
        ) : user ? (
          <>
            {/* Admin shortcut */}
            {isAdmin && (
              <Link href="/admin" className="nav-link admin-link">
                ⚙️ แอดมิน
              </Link>
            )}

            {/* Rider shortcut */}
            {isRider && (
              <Link href="/rider/dashboard" className="nav-link rider-link">
                📦 งานของฉัน
              </Link>
            )}

            {/* User dropdown */}
            <div className="user-menu" ref={menuRef}>
              <button
                className="user-btn"
                onClick={() => setMenuOpen(prev => !prev)}
                aria-expanded={menuOpen}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="user-avatar" />
                ) : (
                  <span className="user-avatar-placeholder" style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="user-name">{displayName}</span>
                <span className="dropdown-arrow">{menuOpen ? '▴' : '▾'}</span>
              </button>

              {menuOpen && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <p className="dropdown-name">{displayName}</p>
                    <p className="dropdown-role">
                      {isAdmin ? '👑 แอดมิน' : isRider ? '🛵 ไรเดอร์' : '👤 ลูกค้า'}
                    </p>
                  </div>
                  <div className="dropdown-divider" />

                  <Link href="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                    👤 โปรไฟล์ของฉัน
                  </Link>

                  {!isAdmin && (
                    <Link href="/orders" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      📋 ออเดอร์ของฉัน
                    </Link>
                  )}

                  {!isRider && !isAdmin && (
                    <Link href="/rider/apply" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                      🛵 สมัครเป็นไรเดอร์
                    </Link>
                  )}

                  <div className="dropdown-divider" />

                  <button onClick={handleSignOut} className="dropdown-item signout-item">
                    🚪 ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link href="/auth" className="signin-btn">
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </nav>
  );
}

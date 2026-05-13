import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { RestaurantProvider } from '@/context/RestaurantContext';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'WUS Delivery — สั่งอาหารออนไลน์',
  description: 'WUS Delivery ค้นหาเมนูอาหารจากร้านชั้นนำ สั่งง่าย จัดส่งไว มีไรเดอร์มืออาชีพ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          <RestaurantProvider>
            <CartProvider>
              <Navbar />
              <main>{children}</main>
            </CartProvider>
          </RestaurantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

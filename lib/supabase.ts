import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin / Auth
export const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL!;
export const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

// WUS Canteen Location
export const DEFAULT_RESTAURANT_LAT = 8.6415;
export const DEFAULT_RESTAURANT_LNG = 99.8970;

/**
 * คำนวณระยะทางระหว่าง 2 จุด (กิโลเมตร)
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * คำนวณค่าส่งจากจำนวนชิ้นอาหาร
 * ชิ้นแรก 10 บาท, ชิ้นต่อไป +5 บาท
 */
export function calcItemBasedFee(totalItems: number): number {
  if (totalItems <= 0) return 0;
  return 10 + ((totalItems - 1) * 5);
}


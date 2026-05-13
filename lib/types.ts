// ─── Cart ─────────────────────────────────────────────────────
export interface CartItem {
  restaurantId: string;
  restaurantName: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  note?: string;
}

// ─── User Profile ─────────────────────────────────────────────
export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  additional_info: string | null;
  role: 'customer' | 'rider' | 'admin';
  is_super_admin: boolean;
  fcm_token: string | null;
  avatar_url: string | null;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Order ────────────────────────────────────────────────────
export interface Order {
  id: string;
  customer_id: string;
  rider_id: string | null;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  rider_lat: number | null;
  rider_lng: number | null;
  queue_number: number | null;
  discount_percent: number | null;
  restaurant_name: string | null;
  note: string | null;
  status: 1 | 2 | 3 | 4;
  cancel_reason: string | null;
  cancelled_by: 'customer' | 'rider' | null;
  chat_expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: Profile;
  rider?: Profile;
}

// ─── Message (Chat) ───────────────────────────────────────────
export interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'image';
  created_at: string;
  sender?: Profile;
}

// ─── Rider Application ────────────────────────────────────────
export interface RiderApplication {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  note: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  user?: Profile;
}

// ─── Notification ─────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ─── Order Status ─────────────────────────────────────────────
export const ORDER_STATUS = {
  1: 'รอไรเดอร์รับงาน',
  2: 'ไรเดอร์รับงานแล้ว',
  3: 'กำลังจัดส่ง',
  4: 'ส่งสำเร็จแล้ว',
} as const;

export type OrderStatus = keyof typeof ORDER_STATUS;

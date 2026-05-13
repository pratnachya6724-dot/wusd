-- WUS Delivery — Full Schema (3-Role System)
-- รันใน: Supabase Dashboard → SQL Editor → New query
-- ════════════════════════════════════════════════════════════════


-- ─── 1. Profiles (ข้อมูลผู้ใช้ทุกคน) ─────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  address TEXT,
  additional_info TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'rider', 'admin')),
  is_super_admin BOOLEAN DEFAULT false,
  fcm_token TEXT,
  avatar_url TEXT,
  onboarding_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Restaurants (ร้านอาหาร) ──────────────────────────────
CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  category TEXT DEFAULT '',
  rating NUMERIC(3,1) DEFAULT 4.5,
  review_count INT DEFAULT 0,
  delivery_time TEXT DEFAULT '20-30',
  min_order INT DEFAULT 50,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Menu Items (เมนูอาหาร) ───────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price INT NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  category TEXT DEFAULT '',
  popular BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true
);

-- ─── 4. Orders (ออเดอร์) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  rider_id UUID REFERENCES profiles(id),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  rider_lat DOUBLE PRECISION,
  rider_lng DOUBLE PRECISION,
  queue_number INT,
  discount_percent INT DEFAULT 0,
  restaurant_name TEXT,
  note TEXT,
  status INT DEFAULT 1 CHECK (status BETWEEN 1 AND 4),
  cancel_reason TEXT,
  cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'rider')),
  chat_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Messages (แชต) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'image')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Rider Applications (คำขอเป็นไรเดอร์) ─────────────────
CREATE TABLE IF NOT EXISTS rider_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- ─── 7. Notifications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rider_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ─── ลบ Policy เก่าก่อน (ถ้ามี) ──────────────────────────────
DROP POLICY IF EXISTS "Public read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Public read menus" ON menu_items;
DROP POLICY IF EXISTS "Admin write restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admin write menus" ON menu_items;
DROP POLICY IF EXISTS "Anyone can read restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admins write restaurants" ON restaurants;
DROP POLICY IF EXISTS "Anyone can read menu items" ON menu_items;
DROP POLICY IF EXISTS "Admins write menu items" ON menu_items;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Customers see own orders" ON orders;
DROP POLICY IF EXISTS "Riders see available or own orders" ON orders;
DROP POLICY IF EXISTS "Admins see all orders" ON orders;
DROP POLICY IF EXISTS "Customers create orders" ON orders;
DROP POLICY IF EXISTS "Riders and customers update orders" ON orders;
DROP POLICY IF EXISTS "Chat participants can read messages" ON messages;
DROP POLICY IF EXISTS "Chat participants can send messages" ON messages;
DROP POLICY IF EXISTS "Users see own applications" ON rider_applications;
DROP POLICY IF EXISTS "Admins see all applications" ON rider_applications;
DROP POLICY IF EXISTS "Users create own application" ON rider_applications;
DROP POLICY IF EXISTS "Admins update applications" ON rider_applications;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON notifications;

-- ─── Profiles Policies ────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── Restaurant Policies ──────────────────────────────────────
CREATE POLICY "Anyone can read restaurants"
  ON restaurants FOR SELECT USING (true);

CREATE POLICY "Admins write restaurants"
  ON restaurants FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── Menu Items Policies ──────────────────────────────────────
CREATE POLICY "Anyone can read menu items"
  ON menu_items FOR SELECT USING (true);

CREATE POLICY "Admins write menu items"
  ON menu_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── Orders Policies ──────────────────────────────────────────
CREATE POLICY "Customers see own orders"
  ON orders FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Riders see available or own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = rider_id OR
    (rider_id IS NULL AND status = 1) OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'rider')
  );

CREATE POLICY "Admins see all orders"
  ON orders FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Customers create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Riders and customers update orders"
  ON orders FOR UPDATE
  USING (auth.uid() = customer_id OR auth.uid() = rider_id OR
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('rider', 'admin')));

-- ─── Messages Policies ────────────────────────────────────────
CREATE POLICY "Chat participants can read messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND (o.customer_id = auth.uid() OR o.rider_id = auth.uid())
    )
  );

CREATE POLICY "Chat participants can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
      AND (o.customer_id = auth.uid() OR o.rider_id = auth.uid())
    )
  );

-- ─── Rider Applications Policies ─────────────────────────────
CREATE POLICY "Users see own applications"
  ON rider_applications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins see all applications"
  ON rider_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "Users create own application"
  ON rider_applications FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins update applications"
  ON rider_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ─── Notifications Policies ───────────────────────────────────
CREATE POLICY "Users see own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
-- Triggers
-- ════════════════════════════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url, role, is_super_admin)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE WHEN NEW.phone = '0930162164' OR (NEW.raw_user_meta_data->>'phone') = '0930162164' THEN 'admin' ELSE 'customer' END,
    NEW.phone = '0930162164' OR (NEW.raw_user_meta_data->>'phone') = '0930162164'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto set chat_expires_at when order status becomes 4
CREATE OR REPLACE FUNCTION handle_order_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 4 AND OLD.status != 4 THEN
    NEW.chat_expires_at = NOW() + INTERVAL '30 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_complete_trigger ON orders;
CREATE TRIGGER order_complete_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_complete();

-- ════════════════════════════════════════════════════════════════
-- Realtime
-- ════════════════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Update messages type for existing installations
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'system', 'image'));

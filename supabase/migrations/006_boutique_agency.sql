-- 1. Update profiles role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role in ('seeker', 'owner', 'manager', 'admin'));

-- Migrate any existing owners or managers to the admin role
UPDATE profiles SET role = 'admin' WHERE role IN ('owner', 'manager');

-- 2. Create landlord_leads table for the public-facing lead-gen page
CREATE TABLE IF NOT EXISTS landlord_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  location text NOT NULL,
  property_details text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE landlord_leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'landlord_leads' AND policyname = 'Public can insert leads') THEN
    CREATE POLICY "Public can insert leads" ON landlord_leads FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'landlord_leads' AND policyname = 'Admins can view leads') THEN
    CREATE POLICY "Admins can view leads" ON landlord_leads FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- 3. Update bookings table for Digital Viewing Tickets
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS viewing_date date;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS viewing_time time;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ticket_code text UNIQUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status in ('unpaid', 'paid'));

-- 4. Update listings policies (Only Admins can post/update/delete any listing)
DROP POLICY IF EXISTS "Owners can insert homes" ON homes;
DROP POLICY IF EXISTS "Owners can update own homes" ON homes;
DROP POLICY IF EXISTS "Owners can delete own homes" ON homes;
DROP POLICY IF EXISTS "Managers can insert hostels" ON hostels;
DROP POLICY IF EXISTS "Managers can update own hostels" ON hostels;
DROP POLICY IF EXISTS "Managers can delete own hostels" ON hostels;
DROP POLICY IF EXISTS "Managers can insert rooms" ON rooms;

-- Homes
CREATE POLICY "Admins can insert homes" ON homes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can update homes" ON homes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can delete homes" ON homes FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Hostels
CREATE POLICY "Admins can insert hostels" ON hostels FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can update hostels" ON hostels FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can delete hostels" ON hostels FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Rooms
CREATE POLICY "Admins can insert rooms" ON rooms FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can update rooms" ON rooms FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can delete rooms" ON rooms FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 5. Bookings policies for Admins
DROP POLICY IF EXISTS "Owners can view bookings for their listings" ON bookings;
DROP POLICY IF EXISTS "Owners can update booking status" ON bookings;

CREATE POLICY "Admins can view all bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can update all bookings" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

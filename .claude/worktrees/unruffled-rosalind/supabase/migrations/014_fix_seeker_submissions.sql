-- 014: Ensure all infrastructure for seeker submissions exists

-- 1. Ensure listing-images bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-images', 'listing-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure storage policies exist for listing-images (drop and recreate to be safe)
DROP POLICY IF EXISTS "Auth users can upload listing images" ON storage.objects;
CREATE POLICY "Auth users can upload listing images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can read listing images" ON storage.objects;
CREATE POLICY "Public can read listing images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- 3. Ensure homes columns exist
ALTER TABLE homes ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}';
ALTER TABLE homes ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_admin';
ALTER TABLE homes ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS lng numeric;

-- 4. Ensure hostels columns exist
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}';
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS manager_phone text;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_admin';
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS lat numeric;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS lng numeric;

-- 5. Ensure insert policies are permissive for authenticated users
DROP POLICY IF EXISTS "Owners can insert homes" ON homes;
CREATE POLICY "Owners can insert homes" ON homes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers can insert hostels" ON hostels;
CREATE POLICY "Managers can insert hostels" ON hostels FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers can insert rooms" ON rooms;
CREATE POLICY "Managers can insert rooms" ON rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 6. Ensure admin can update any listing (for approvals)
DROP POLICY IF EXISTS "Admin can update any home" ON homes;
CREATE POLICY "Admin can update any home" ON homes FOR UPDATE
  USING (
    auth.uid()::text = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin can update any hostel" ON hostels;
CREATE POLICY "Admin can update any hostel" ON hostels FOR UPDATE
  USING (
    auth.uid()::text = manager_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

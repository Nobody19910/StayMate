-- 015: Admin delete policies for listings

-- Admin can delete any home
DROP POLICY IF EXISTS "Admin can delete any home" ON homes;
CREATE POLICY "Admin can delete any home" ON homes FOR DELETE
  USING (
    auth.uid()::text = owner_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admin can delete any hostel
DROP POLICY IF EXISTS "Admin can delete any hostel" ON hostels;
CREATE POLICY "Admin can delete any hostel" ON hostels FOR DELETE
  USING (
    auth.uid()::text = manager_id
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Admin can read all profiles (for agents directory)
DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
CREATE POLICY "Admin can read all profiles" ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 016: Fix RLS infinite recursion + restore admin + fix listings visibility

-- ─── 1. Fix profiles RLS (remove the recursive policy) ─────────────────────────
-- The policy "Admin can read all profiles" caused infinite recursion because
-- it referenced the profiles table from within a profiles RLS policy.
-- Replace it with a safe version using auth.jwt() metadata instead.

DROP POLICY IF EXISTS "Admin can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Safe: users read own profile, OR if the JWT role claim says admin
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Separate admin READ-ALL policy using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "Admin can read all profiles" ON profiles FOR SELECT
  USING (is_admin() OR auth.uid() = id);

-- ─── 2. Fix homes/hostels SELECT policies (use is_admin() to avoid recursion) ──

DROP POLICY IF EXISTS "Public can read approved homes" ON homes;
CREATE POLICY "Public can read approved homes" ON homes FOR SELECT USING (
  status = 'approved'
  OR status IS NULL
  OR owner_id = auth.uid()::text
  OR is_admin()
);

DROP POLICY IF EXISTS "Public can read approved hostels" ON hostels;
CREATE POLICY "Public can read approved hostels" ON hostels FOR SELECT USING (
  status = 'approved'
  OR status IS NULL
  OR manager_id = auth.uid()::text
  OR is_admin()
);

-- ─── 3. Fix admin update/delete policies to use is_admin() ───────────────────

DROP POLICY IF EXISTS "Admin can update any home" ON homes;
CREATE POLICY "Admin can update any home" ON homes FOR UPDATE
  USING (auth.uid()::text = owner_id OR is_admin());

DROP POLICY IF EXISTS "Admin can update any hostel" ON hostels;
CREATE POLICY "Admin can update any hostel" ON hostels FOR UPDATE
  USING (auth.uid()::text = manager_id OR is_admin());

DROP POLICY IF EXISTS "Admin can delete any home" ON homes;
CREATE POLICY "Admin can delete any home" ON homes FOR DELETE
  USING (auth.uid()::text = owner_id OR is_admin());

DROP POLICY IF EXISTS "Admin can delete any hostel" ON hostels;
CREATE POLICY "Admin can delete any hostel" ON hostels FOR DELETE
  USING (auth.uid()::text = manager_id OR is_admin());

-- ─── 4. Restore staymate8@gmail.com as admin ────────────────────────────────
UPDATE public.profiles
SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'staymate8@gmail.com' LIMIT 1);

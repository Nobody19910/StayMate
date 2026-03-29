-- 011_dual_mode_schema.sql

-- 1. Profiles Updates
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS kyc_status text DEFAULT 'unverified' CHECK (kyc_status in ('unverified', 'pending', 'verified')),
ADD COLUMN IF NOT EXISTS agent_mode_enabled boolean DEFAULT false;

-- 2. KYC Submissions Table
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  id_card_name text NOT NULL,
  image_url text,
  status text DEFAULT 'pending' CHECK (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_submissions' AND policyname = 'Users can view their own KYC') THEN
    CREATE POLICY "Users can view their own KYC" ON kyc_submissions FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_submissions' AND policyname = 'Users can insert their own KYC') THEN
    CREATE POLICY "Users can insert their own KYC" ON kyc_submissions FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'kyc_submissions' AND policyname = 'Admins manage KYC') THEN
    CREATE POLICY "Admins manage KYC" ON kyc_submissions FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    );
  END IF;
END $$;

-- 3. Listings Updates
ALTER TABLE homes
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_admin' CHECK (status in ('pending_admin', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS lat numeric,
ADD COLUMN IF NOT EXISTS lng numeric;

ALTER TABLE hostels
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_admin' CHECK (status in ('pending_admin', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS lat numeric,
ADD COLUMN IF NOT EXISTS lng numeric;

-- Backfill existing listings to approved
UPDATE homes SET status = 'approved' WHERE status = 'pending_admin';
UPDATE hostels SET status = 'approved' WHERE status = 'pending_admin';

DROP POLICY IF EXISTS "Anyone can read homes" ON homes;
DROP POLICY IF EXISTS "Public can read approved homes" ON homes;
CREATE POLICY "Public can read approved homes" ON homes FOR SELECT USING (
  status = 'approved' 
  OR owner_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "Anyone can read hostels" ON hostels;
DROP POLICY IF EXISTS "Public can read approved hostels" ON hostels;
CREATE POLICY "Public can read approved hostels" ON hostels FOR SELECT USING (
  status = 'approved' 
  OR manager_id = auth.uid()::text
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 009_landlord_leads_seeker_id.sql

-- Add seeker_id column to landlord_leads so we can track which user submitted it
ALTER TABLE landlord_leads ADD COLUMN IF NOT EXISTS seeker_id uuid REFERENCES auth.users(id);

-- Allow authenticated users to insert leads (with their own seeker_id)
DROP POLICY IF EXISTS "Public can insert leads" ON landlord_leads;
CREATE POLICY "Authenticated users can insert leads" ON landlord_leads FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow seekers to view their OWN submissions
CREATE POLICY "Seekers can view own leads" ON landlord_leads FOR SELECT USING (
  seeker_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

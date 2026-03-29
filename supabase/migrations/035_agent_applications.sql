-- 035: Agent applications table for concierge verification flow

CREATE TABLE IF NOT EXISTS agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  id_type text NOT NULL,
  id_number text NOT NULL,
  id_photo_url text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can submit applications" ON agent_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON agent_applications;
DROP POLICY IF EXISTS "Admins can do everything" ON agent_applications;

CREATE POLICY "Users can submit applications"
  ON agent_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications"
  ON agent_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can do everything"
  ON agent_applications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id::text = auth.uid()::text
        AND profiles.role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';

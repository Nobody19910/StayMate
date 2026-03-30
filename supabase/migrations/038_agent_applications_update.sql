-- 038: Allow users to update their own agent applications + add updated_at

ALTER TABLE agent_applications
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Allow users to update their own application
DROP POLICY IF EXISTS "Users can update own applications" ON agent_applications;
CREATE POLICY "Users can update own applications"
  ON agent_applications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';

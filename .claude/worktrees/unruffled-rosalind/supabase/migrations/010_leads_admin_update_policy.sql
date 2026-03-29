-- 010_leads_admin_update_policy.sql

-- Allow admins to update leads (for approve/reject actions)
CREATE POLICY "Admins can update leads" ON landlord_leads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Audit logging for sensitive operations
-- Tracks booking status changes and property modifications

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for querying by record and by user
CREATE INDEX idx_audit_logs_record ON audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);

-- RLS: only admins can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- No INSERT policy for users — only triggers write to this table
-- Grant insert to the postgres role (used by triggers)
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Trigger function: log booking status changes
CREATE OR REPLACE FUNCTION audit_booking_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      coalesce(auth.uid()::text, 'system'),
      'booking_status_change',
      'bookings',
      NEW.id::text,
      jsonb_build_object('status', OLD.status, 'payment_reference', OLD.payment_reference),
      jsonb_build_object('status', NEW.status, 'payment_reference', NEW.payment_reference)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_booking_update
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION audit_booking_update();

-- Trigger function: log property deletions
CREATE OR REPLACE FUNCTION audit_property_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    coalesce(auth.uid()::text, 'system'),
    'property_deleted',
    TG_TABLE_NAME,
    OLD.id::text,
    jsonb_build_object('title', OLD.title, 'city', OLD.city),
    NULL
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_home_delete
  AFTER DELETE ON homes
  FOR EACH ROW
  EXECUTE FUNCTION audit_property_delete();

CREATE TRIGGER trg_audit_hostel_delete
  AFTER DELETE ON hostels
  FOR EACH ROW
  EXECUTE FUNCTION audit_property_delete();

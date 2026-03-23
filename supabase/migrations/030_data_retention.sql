-- Data retention policy
-- Archives messages older than 2 years, deletes stale push subscriptions

-- Archive table for old messages
CREATE TABLE IF NOT EXISTS messages_archive (
  LIKE messages INCLUDING ALL
);

-- Function: move old messages to archive
CREATE OR REPLACE FUNCTION archive_old_messages()
RETURNS void AS $$
BEGIN
  -- Move messages older than 2 years to archive
  INSERT INTO messages_archive
  SELECT * FROM messages
  WHERE created_at < now() - interval '2 years';

  DELETE FROM messages
  WHERE created_at < now() - interval '2 years';

  -- Delete push subscriptions not updated in 6 months (likely stale)
  DELETE FROM push_subscriptions
  WHERE created_at < now() - interval '6 months';

  -- Delete audit logs older than 3 years
  DELETE FROM audit_logs
  WHERE created_at < now() - interval '3 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- To schedule: run in Supabase SQL Editor after enabling pg_cron:
-- SELECT cron.schedule('weekly-cleanup', '0 3 * * 0', 'SELECT archive_old_messages()');

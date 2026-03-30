-- Enable realtime on agent_applications for status updates
ALTER TABLE agent_applications REPLICA IDENTITY FULL;

-- Add agent_applications to realtime publication if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_applications;
  END IF;
END $$;

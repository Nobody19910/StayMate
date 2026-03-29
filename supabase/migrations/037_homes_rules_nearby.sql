-- Add rules and nearby JSONB columns to homes
ALTER TABLE homes ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT '{}'::jsonb;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS nearby jsonb DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';

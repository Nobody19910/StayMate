-- Add metadata columns to homes table for enhanced filtering
ALTER TABLE homes
  ADD COLUMN IF NOT EXISTS condition text,
  ADD COLUMN IF NOT EXISTS furnishing text,
  ADD COLUMN IF NOT EXISTS service_charge numeric,
  ADD COLUMN IF NOT EXISTS is_negotiable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS land_size numeric;

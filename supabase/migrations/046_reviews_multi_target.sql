-- Allow multiple review types per booking (property, agent, concierge)
-- Drop the single-booking unique index and replace with per-target unique
DROP INDEX IF EXISTS reviews_booking_unique;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'property'
  CHECK (target_type IN ('property', 'agent', 'concierge'));

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS target_id text; -- agent/admin user id for non-property reviews

CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_target_unique
  ON reviews(booking_id, target_type);

-- Track who closed a deal and when
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES auth.users(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS close_action text; -- 'rented' | 'sold'

NOTIFY pgrst, 'reload schema';

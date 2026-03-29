-- Add property_ref column to store the actual text ID of the property
-- (homes.id and hostels.id are text, but property_id is UUID — they don't match)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS property_ref text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seeker_name text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seeker_phone text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seeker_email text;

NOTIFY pgrst, 'reload schema';

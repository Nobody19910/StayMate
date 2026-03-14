-- 024: Add 'paid' to bookings status and track payment reference
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Update the status check constraint to allow 'paid'
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'paid', 'cancelled', 'approved'));

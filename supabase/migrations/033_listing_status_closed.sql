-- Allow owners to mark listings as rented/sold/full without deleting them.
-- These statuses are already filtered from browse queries in api.ts.

-- Drop existing CHECK constraints on homes and hostels status columns
ALTER TABLE homes DROP CONSTRAINT IF EXISTS homes_status_check;
ALTER TABLE hostels DROP CONSTRAINT IF EXISTS hostels_status_check;

-- Re-add with expanded status values
ALTER TABLE homes
  ADD CONSTRAINT homes_status_check
    CHECK (status IN ('pending_admin', 'approved', 'rejected', 'rented', 'sold'));

ALTER TABLE hostels
  ADD CONSTRAINT hostels_status_check
    CHECK (status IN ('pending_admin', 'approved', 'rejected', 'full'));

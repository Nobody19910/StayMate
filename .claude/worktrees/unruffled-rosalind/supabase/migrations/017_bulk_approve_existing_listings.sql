-- 017: Bulk approve all existing listings that are not pending or rejected
-- This makes all seed data and previously uploaded listings visible in the live feed.

UPDATE homes
SET status = 'approved'
WHERE status IS NULL OR status NOT IN ('pending_admin', 'rejected');

UPDATE hostels
SET status = 'approved'
WHERE status IS NULL OR status NOT IN ('pending_admin', 'rejected');

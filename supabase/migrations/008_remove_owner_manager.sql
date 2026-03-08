-- 008_remove_owner_manager.sql

-- 1. Explicitly make staymate8@gmail.com an admin
UPDATE public.profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'staymate8@gmail.com'
);

-- 2. Convert all remaining owners and managers to seekers
UPDATE public.profiles
SET role = 'seeker'
WHERE role IN ('owner', 'manager');

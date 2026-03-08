-- 007_assign_admins.sql

-- 1. Automatically assign the primary (first created) user as an admin and give them ownership of all properties
DO $$
DECLARE
  primary_admin_id UUID;
BEGIN
  -- Find the first user ever registered (this is usually the owner/creator of the project)
  SELECT id INTO primary_admin_id 
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF primary_admin_id IS NOT NULL THEN
    -- Make this primary user an admin
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE id = primary_admin_id;
    
    -- Assign all existing homes to this admin
    UPDATE public.homes 
    SET owner_id = primary_admin_id;
    
    -- Assign all existing hostels to this admin
    UPDATE public.hostels 
    SET manager_id = primary_admin_id;
  END IF;
END $$;

-- 2. Placeholders for assigning additional admins in the future.
-- To add more admins, simply copy these statements, replace the email, and run them in the Supabase SQL Editor.

-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin2@staymate.com';
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin3@staymate.com';

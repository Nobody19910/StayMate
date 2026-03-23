-- Step 1: Create the admin auth user in Supabase Auth
-- Go to: https://app.supabase.com/project/mflxmulbguafoyytgumk/auth/users
-- Create a new user with email: admin@staymate.app and a secure password

-- Step 2: Once the user is created, run this SQL in the SQL Editor
-- Get the UUID of the user you just created and replace it below

-- UPDATE profiles SET role = 'admin' WHERE id = 'USER_UUID_HERE';

-- For now, here's a query to create/update a profile as admin if you have access:
INSERT INTO profiles (id, full_name, phone, avatar_url, role, kyc_status, agent_mode_enabled, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000', -- Replace with actual user UUID
  'StayMate Admin',
  '+233123456789',
  NULL,
  'admin',
  'verified',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  updated_at = NOW();

-- List all current users and their roles
SELECT id, email, role FROM profiles ORDER BY created_at DESC LIMIT 10;

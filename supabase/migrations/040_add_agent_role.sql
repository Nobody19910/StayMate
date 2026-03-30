-- Allow 'agent' in the profiles role CHECK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role in ('seeker', 'owner', 'manager', 'admin', 'agent'));

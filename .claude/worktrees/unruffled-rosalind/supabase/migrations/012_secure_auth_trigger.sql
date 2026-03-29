-- ─── Secure Auth Profile Trigger ──────────────────────────────────────────────

-- 1. Create a function to automatically insert a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, kyc_status, agent_mode_enabled)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'seeker'),
    'unverified',
    false
  );
  return new;
end;
$$;

-- 2. Create the trigger on the auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 1. Backfill Missing Profiles ──────────────────────────────────────────────

-- Find any user in auth.users who doesn't have a record in public.profiles
-- and create a profile for them. This fixes users who signed up before the trigger was added.
insert into public.profiles (id, full_name, phone, role, kyc_status, agent_mode_enabled)
select 
  u.id, 
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 
  null, 
  coalesce(u.raw_user_meta_data->>'role', 'seeker'), 
  'unverified', 
  false
from auth.users u
left join public.profiles p on u.id = p.id
where p.id is null;

-- ─── 2. Assign Admin Role & Setup Storage ─────────────────────────────────────

-- Ensure staymate8@gmail.com is an admin
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'staymate8@gmail.com' limit 1);

-- Ensure avatar_url column exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='avatar_url') then
    alter table public.profiles add column avatar_url text;
  end if;
end $$;

-- ─── 3. Storage Bucket for Avatars ────────────────────────────────────────────
insert into storage.buckets (id, name, public) 
values ('avatars', 'avatars', true) 
on conflict (id) do nothing;

create policy "Anyone can view avatars"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatars"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' and auth.uid() = owner );

create policy "Users can update their own avatars"
  on storage.objects for update
  using ( bucket_id = 'avatars' and auth.uid() = owner );

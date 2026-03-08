-- ─── User profiles (extends Supabase auth.users) ─────────────────────────────

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  role        text not null default 'seeker' check (role in ('seeker', 'owner', 'manager')),
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;

-- Users can read/update their own profile
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can view own profile') then
    create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'profiles' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
  end if;
end $$;

-- ─── Link homes + hostels to auth.users ───────────────────────────────────────

-- Allow owners to insert their own homes
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'homes' and policyname = 'Owners can insert homes') then
    create policy "Owners can insert homes" on homes for insert with check (auth.uid()::text = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'homes' and policyname = 'Owners can update own homes') then
    create policy "Owners can update own homes" on homes for update using (auth.uid()::text = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'homes' and policyname = 'Owners can delete own homes') then
    create policy "Owners can delete own homes" on homes for delete using (auth.uid()::text = owner_id);
  end if;
end $$;

-- Allow managers to insert/manage their own hostels and rooms
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'hostels' and policyname = 'Managers can insert hostels') then
    create policy "Managers can insert hostels" on hostels for insert with check (auth.uid()::text = manager_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hostels' and policyname = 'Managers can update own hostels') then
    create policy "Managers can update own hostels" on hostels for update using (auth.uid()::text = manager_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'hostels' and policyname = 'Managers can delete own hostels') then
    create policy "Managers can delete own hostels" on hostels for delete using (auth.uid()::text = manager_id);
  end if;
end $$;

-- ─── Bookings table ───────────────────────────────────────────────────────────

create table if not exists bookings (
  id                  uuid primary key default gen_random_uuid(),
  listing_id          text not null,
  listing_type        text not null check (listing_type in ('home', 'hostel_room')),
  listing_title       text not null,
  seeker_id           uuid not null references auth.users(id) on delete cascade,
  seeker_name         text not null,
  seeker_email        text not null,
  seeker_phone        text,
  price_label         text not null,
  owner_id            text not null,
  status              text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at          timestamptz not null default now(),
  expires_at          timestamptz not null default (now() + interval '2 hours')
);

alter table bookings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'bookings' and policyname = 'Seekers can insert own bookings') then
    create policy "Seekers can insert own bookings" on bookings for insert with check (auth.uid() = seeker_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bookings' and policyname = 'Seekers can view own bookings') then
    create policy "Seekers can view own bookings" on bookings for select using (auth.uid() = seeker_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bookings' and policyname = 'Owners can view bookings for their listings') then
    create policy "Owners can view bookings for their listings" on bookings for select using (auth.uid()::text = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bookings' and policyname = 'Owners can update booking status') then
    create policy "Owners can update booking status" on bookings for update using (auth.uid()::text = owner_id);
  end if;
end $$;

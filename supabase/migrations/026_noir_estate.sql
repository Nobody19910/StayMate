-- ── Noir Estate Migration ────────────────────────────────────────────────────
-- Adds: sponsored fields, rich media, extended booking status, RPC search fn

-- 1. Sponsored listing columns on homes
alter table homes
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists sponsored_until timestamptz,
  add column if not exists priority_score integer not null default 0,
  add column if not exists video_url text,
  add column if not exists lifestyle_tags text[] default '{}';

-- 2. Sponsored listing columns on hostels
alter table hostels
  add column if not exists is_sponsored boolean not null default false,
  add column if not exists sponsored_until timestamptz,
  add column if not exists priority_score integer not null default 0,
  add column if not exists video_url text,
  add column if not exists lifestyle_tags text[] default '{}';

-- 3. Extended booking status
-- Old: pending | confirmed | cancelled | completed
-- New: pending | accepted | fee_paid | viewing_scheduled | completed | rejected
alter table bookings
  alter column status type text,
  add column if not exists payment_reference text;

-- Drop old enum if it was one (safe – only if column is text now)
-- Add a check constraint for the new set of statuses
alter table bookings
  drop constraint if exists bookings_status_check;

alter table bookings
  add constraint bookings_status_check
    check (status in ('pending','accepted','fee_paid','viewing_scheduled','completed','rejected'));

-- 4. Sponsored-first RPC search function for homes
create or replace function search_homes(
  p_query      text     default '',
  p_for_rent   boolean  default null,
  p_min_price  numeric  default 0,
  p_max_price  numeric  default 999999999,
  p_amenities  text[]   default '{}',
  p_lat        double precision default null,
  p_lng        double precision default null,
  p_radius_km  double precision default null
)
returns setof homes
language sql stable
as $$
  select *
  from homes
  where
    status = 'approved'
    and (p_query = '' or
         title ilike '%' || p_query || '%' or
         city  ilike '%' || p_query || '%' or
         address ilike '%' || p_query || '%')
    and (p_for_rent is null or for_sale = not p_for_rent)
    and price >= p_min_price
    and price <= p_max_price
    and (p_amenities = '{}' or amenities @> p_amenities)
    and (
      p_lat is null or p_lng is null or p_radius_km is null or
      (
        2 * 6371 * asin(sqrt(
          power(sin(radians((lat - p_lat) / 2)), 2) +
          cos(radians(p_lat)) * cos(radians(lat)) *
          power(sin(radians((lng - p_lng) / 2)), 2)
        )) <= p_radius_km
      )
    )
  order by
    is_sponsored desc,
    case when is_sponsored and sponsored_until > now() then 1 else 0 end desc,
    priority_score desc,
    created_at desc;
$$;

-- 5. Sponsored-first RPC search function for hostels
create or replace function search_hostels(
  p_query      text     default '',
  p_amenities  text[]   default '{}',
  p_lat        double precision default null,
  p_lng        double precision default null,
  p_radius_km  double precision default null
)
returns setof hostels
language sql stable
as $$
  select *
  from hostels
  where
    status = 'approved'
    and (p_query = '' or
         name    ilike '%' || p_query || '%' or
         city    ilike '%' || p_query || '%' or
         address ilike '%' || p_query || '%')
    and (p_amenities = '{}' or amenities @> p_amenities)
    and (
      p_lat is null or p_lng is null or p_radius_km is null or
      (
        2 * 6371 * asin(sqrt(
          power(sin(radians((lat - p_lat) / 2)), 2) +
          cos(radians(p_lat)) * cos(radians(lat)) *
          power(sin(radians((lng - p_lng) / 2)), 2)
        )) <= p_radius_km
      )
    )
  order by
    is_sponsored desc,
    case when is_sponsored and sponsored_until > now() then 1 else 0 end desc,
    priority_score desc,
    created_at desc;
$$;

-- 6. Admin can toggle sponsored status (only service role / admin)
-- No extra RLS needed — existing admin checks cover it.

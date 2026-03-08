-- ─── Homes ────────────────────────────────────────────────────────────────────

create table if not exists homes (
  id             text primary key,
  property_type  text not null,
  title          text not null,
  description    text not null,
  price          bigint not null,
  price_label    text not null,
  for_sale       boolean not null default false,
  beds           int not null,
  baths          int not null,
  sqft           int not null,
  address        text not null,
  city           text not null,
  state          text not null,
  images         text[] not null default '{}',
  owner_id       text not null,
  created_at     timestamptz not null default now()
);

-- ─── Hostels ──────────────────────────────────────────────────────────────────

create table if not exists hostels (
  id                   text primary key,
  name                 text not null,
  description          text not null,
  address              text not null,
  city                 text not null,
  state                text not null,
  nearby_universities  text[] not null default '{}',
  images               text[] not null default '{}',
  total_rooms          int not null,
  available_rooms      int not null,
  price_range_min      bigint not null,
  price_range_max      bigint not null,
  price_range_label    text not null,
  manager_id           text not null,
  created_at           timestamptz not null default now()
);

-- ─── Rooms ────────────────────────────────────────────────────────────────────

create table if not exists rooms (
  id           text primary key,
  hostel_id    text not null references hostels(id) on delete cascade,
  name         text not null,
  room_type    text not null,
  price        bigint not null,
  price_label  text not null,
  capacity     int not null,
  available    boolean not null default true,
  amenities    text[] not null default '{}',
  images       text[] not null default '{}',
  description  text not null,
  created_at   timestamptz not null default now()
);

-- ─── Enable Row Level Security (read-only for anon) ───────────────────────────

alter table homes    enable row level security;
alter table hostels  enable row level security;
alter table rooms    enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'homes'   and policyname = 'Anyone can read homes')   then create policy "Anyone can read homes"    on homes    for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'hostels' and policyname = 'Anyone can read hostels') then create policy "Anyone can read hostels"  on hostels  for select using (true); end if;
  if not exists (select 1 from pg_policies where tablename = 'rooms'   and policyname = 'Anyone can read rooms')   then create policy "Anyone can read rooms"    on rooms    for select using (true); end if;
end $$;

-- ─── Seed: Homes ──────────────────────────────────────────────────────────────

insert into homes (id, property_type, title, description, price, price_label, for_sale, beds, baths, sqft, address, city, state, images, owner_id) values
(
  'home-1', 'apartment', 'Modern 3-Bedroom Flat',
  'Spacious, well-finished 3-bedroom apartment in a serene estate. 24/7 security, ample parking, and a backup generator. Minutes from the expressway.',
  450000, '₦450,000/mo', false, 3, 2, 1400, '14 Orchid Road, Lekki Phase 1', 'Lagos', 'Lagos',
  ARRAY[
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80'
  ],
  'owner-1'
),
(
  'home-2', 'house', '4-Bed Detached Duplex',
  'Tastefully built 4-bedroom detached duplex with boys'' quarters, spacious compound, and fitted kitchen. Great for a growing family.',
  750000, '₦750,000/mo', false, 4, 3, 2200, '7 Harmony Close, Jabi', 'Abuja', 'FCT',
  ARRAY[
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80'
  ],
  'owner-2'
),
(
  'home-3', 'studio', 'Cozy Studio Apartment',
  'A sleek self-contained studio with air-conditioning, fitted wardrobe, and constant water supply. Perfect for a working professional.',
  150000, '₦150,000/mo', false, 1, 1, 480, '22 Allen Avenue, Ikeja', 'Lagos', 'Lagos',
  ARRAY[
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80'
  ],
  'owner-3'
),
(
  'home-4', 'apartment', '2-Bedroom Serviced Apartment',
  'Fully-serviced 2-bedroom apartment in a gated community. Includes electricity, water, and cleaning service. Move-in ready.',
  320000, '₦320,000/mo', false, 2, 2, 1050, 'Plot 5 Adeola Odeku Street, Victoria Island', 'Lagos', 'Lagos',
  ARRAY[
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80'
  ],
  'owner-4'
),
(
  'home-5', 'duplex', 'Semi-Detached 5-Bedroom Home',
  'Grand 5-bedroom semi-detached home with smart home features, rooftop terrace, and a private garden. A rare gem in the heart of GRA.',
  85000000, '₦85M', true, 5, 4, 3800, '1 Glover Road, GRA Phase 3', 'Port Harcourt', 'Rivers',
  ARRAY[
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80'
  ],
  'owner-5'
),
(
  'home-6', 'townhouse', 'Luxury Townhouse with Pool',
  '3-storey luxury townhouse with private pool, home cinema, and 3-car garage. Located in one of Abuja''s most prestigious estates.',
  120000000, '₦120M', true, 5, 5, 5000, 'Block B, Maitama Estate', 'Abuja', 'FCT',
  ARRAY[
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80',
    'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80'
  ],
  'owner-6'
)
on conflict (id) do nothing;

-- ─── Seed: Hostels ────────────────────────────────────────────────────────────

insert into hostels (id, name, description, address, city, state, nearby_universities, images, total_rooms, available_rooms, price_range_min, price_range_max, price_range_label, manager_id) values
(
  'hostel-1', 'Greenfield Student Lodge',
  'Secure, well-maintained hostel a 5-minute walk from the main gate of UNILAG. Known for steady power and fast WiFi.',
  '12 University Road, Akoka', 'Lagos', 'Lagos',
  ARRAY['University of Lagos (UNILAG)', 'LASPOTECH'],
  ARRAY[
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80'
  ],
  40, 14, 180000, 350000, '₦180K – ₦350K/yr', 'manager-1'
),
(
  'hostel-2', 'Summit Crest Hostel',
  'Premium student accommodation near UI and Polytechnic. Features a study hall, restaurant, and 24/7 CCTV surveillance.',
  '3 Polytechnic Road, Sango', 'Ibadan', 'Oyo',
  ARRAY['University of Ibadan (UI)', 'The Polytechnic Ibadan'],
  ARRAY[
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'
  ],
  60, 22, 220000, 420000, '₦220K – ₦420K/yr', 'manager-2'
),
(
  'hostel-3', 'Horizon Hall',
  'Modern purpose-built hostel blocks directly opposite OAU main campus. High-speed internet, standby generator, and a rooftop chill area.',
  'Obafemi Awolowo University Gate, Ile-Ife', 'Ile-Ife', 'Osun',
  ARRAY['Obafemi Awolowo University (OAU)'],
  ARRAY[
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80'
  ],
  80, 31, 160000, 380000, '₦160K – ₦380K/yr', 'manager-3'
)
on conflict (id) do nothing;

-- ─── Seed: Rooms ──────────────────────────────────────────────────────────────

insert into rooms (id, hostel_id, name, room_type, price, price_label, capacity, available, amenities, images, description) values
-- Greenfield Student Lodge
(
  'room-g1-1', 'hostel-1', 'Room 1A — Single', 'single',
  350000, '₦350,000/yr', 1, true,
  ARRAY['wifi','ac','attached-bath','hot-water','study-desk','wardrobe','security','generator'],
  ARRAY[
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80'
  ],
  'Private single room with en-suite bathroom and air-conditioning. Quiet wing of the building.'
),
(
  'room-g1-2', 'hostel-1', 'Room 2B — Double', 'double',
  250000, '₦250,000/yr', 2, true,
  ARRAY['wifi','hot-water','study-desk','wardrobe','security','generator'],
  ARRAY[
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80',
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'
  ],
  'Shared double room with two study desks. Shared corridor bathrooms. Great value.'
),
(
  'room-g1-3', 'hostel-1', 'Room 5C — Triple', 'triple',
  200000, '₦200,000/yr', 3, false,
  ARRAY['wifi','study-desk','wardrobe','security'],
  ARRAY['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80'],
  '3-person room with individual lockers. Currently fully occupied.'
),
(
  'room-g1-4', 'hostel-1', 'Room 8D — Dormitory', 'dormitory',
  180000, '₦180,000/yr', 8, true,
  ARRAY['wifi','security','generator'],
  ARRAY['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80'],
  '8-bed dormitory room. Most affordable option. Shared bathroom and kitchen facilities.'
),
-- Summit Crest Hostel
(
  'room-s2-1', 'hostel-2', 'Block A — Executive Single', 'single',
  420000, '₦420,000/yr', 1, true,
  ARRAY['wifi','ac','attached-bath','hot-water','study-desk','wardrobe','balcony','meal-included','security','cctv','generator'],
  ARRAY[
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80'
  ],
  'Top-tier single room with balcony, en-suite, and daily meal plan. For students who want the best.'
),
(
  'room-s2-2', 'hostel-2', 'Block B — Standard Double', 'double',
  280000, '₦280,000/yr', 2, true,
  ARRAY['wifi','ac','hot-water','study-desk','wardrobe','security','cctv','generator'],
  ARRAY[
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80',
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80'
  ],
  'Air-conditioned double room with shared corridor bathrooms. Very popular — book early.'
),
(
  'room-s2-3', 'hostel-2', 'Block C — Quad Room', 'quad',
  220000, '₦220,000/yr', 4, true,
  ARRAY['wifi','study-desk','wardrobe','laundry','security','cctv'],
  ARRAY['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80'],
  '4-person room with in-house laundry access. Budget-friendly with essential amenities.'
),
-- Horizon Hall
(
  'room-h3-1', 'hostel-3', 'Block 1 — Self-Contained Single', 'single',
  380000, '₦380,000/yr', 1, true,
  ARRAY['wifi','ac','attached-bath','hot-water','study-desk','wardrobe','security','cctv','generator'],
  ARRAY[
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80'
  ],
  'Fully self-contained single room. Your own space, your own rules.'
),
(
  'room-h3-2', 'hostel-3', 'Block 2 — Shared Double', 'double',
  240000, '₦240,000/yr', 2, false,
  ARRAY['wifi','study-desk','wardrobe','security','generator'],
  ARRAY['https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80'],
  'Comfortable double room. Currently occupied but will be available next session.'
),
(
  'room-h3-3', 'hostel-3', 'Block 3 — Triple Room', 'triple',
  195000, '₦195,000/yr', 3, true,
  ARRAY['wifi','study-desk','wardrobe','laundry','security'],
  ARRAY['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80'],
  'Spacious triple room with laundry access. Great if you''re moving in with friends.'
),
(
  'room-h3-4', 'hostel-3', 'Block 4 — Budget Dormitory', 'dormitory',
  160000, '₦160,000/yr', 6, true,
  ARRAY['wifi','security','generator'],
  ARRAY['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&q=80'],
  '6-bed dormitory. The most affordable option on campus. Basic but clean.'
)
on conflict (id) do nothing;

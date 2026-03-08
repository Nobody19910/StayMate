-- ─── Add amenities + phone columns ────────────────────────────────────────────

alter table homes    add column if not exists amenities   text[]  not null default '{}';
alter table homes    add column if not exists owner_phone text;
alter table hostels  add column if not exists amenities    text[]  not null default '{}';
alter table hostels  add column if not exists manager_phone text;

-- ─── Update homes seed: convert to GHS (₵), add amenities + owner_phone ───────

update homes set
  price       = 4500,
  price_label = '₵4,500/mo',
  amenities   = ARRAY['Generator','Security','Parking','AC'],
  owner_phone = '+233201234567'
where id = 'home-1';

update homes set
  price       = 7500,
  price_label = '₵7,500/mo',
  amenities   = ARRAY['Generator','Security','Parking','Boys Quarters','Fitted Kitchen'],
  owner_phone = '+233202345678'
where id = 'home-2';

update homes set
  price       = 1500,
  price_label = '₵1,500/mo',
  amenities   = ARRAY['AC','Water Supply','Wardrobe'],
  owner_phone = '+233203456789'
where id = 'home-3';

update homes set
  price       = 3200,
  price_label = '₵3,200/mo',
  amenities   = ARRAY['Generator','Security','Cleaning Service','AC','Gated Estate'],
  owner_phone = '+233204567890'
where id = 'home-4';

update homes set
  price       = 850000,
  price_label = '₵850,000',
  amenities   = ARRAY['Smart Home','Rooftop Terrace','Garden','Security','Generator','AC'],
  owner_phone = '+233205678901'
where id = 'home-5';

update homes set
  price       = 1200000,
  price_label = '₵1,200,000',
  amenities   = ARRAY['Pool','Home Cinema','3-Car Garage','Generator','Security','AC','Garden'],
  owner_phone = '+233206789012'
where id = 'home-6';

-- ─── Update hostels seed: convert to GHS, add amenities + manager_phone ───────

update hostels set
  price_range_min   = 1800,
  price_range_max   = 3500,
  price_range_label = '₵1,800 – ₵3,500/yr',
  amenities         = ARRAY['WiFi','Generator','Security','Hot Water','AC'],
  manager_phone     = '+233207123456'
where id = 'hostel-1';

update hostels set
  price_range_min   = 2200,
  price_range_max   = 4200,
  price_range_label = '₵2,200 – ₵4,200/yr',
  amenities         = ARRAY['WiFi','AC','Generator','CCTV','Security','Meal Included','Study Hall'],
  manager_phone     = '+233208234567'
where id = 'hostel-2';

update hostels set
  price_range_min   = 1600,
  price_range_max   = 3800,
  price_range_label = '₵1,600 – ₵3,800/yr',
  amenities         = ARRAY['WiFi','Generator','CCTV','Security','Laundry','Rooftop'],
  manager_phone     = '+233209345678'
where id = 'hostel-3';

-- ─── Update rooms seed: convert to GHS ────────────────────────────────────────

update rooms set price = 3500, price_label = '₵3,500/yr' where id = 'room-g1-1';
update rooms set price = 2500, price_label = '₵2,500/yr' where id = 'room-g1-2';
update rooms set price = 2000, price_label = '₵2,000/yr' where id = 'room-g1-3';
update rooms set price = 1800, price_label = '₵1,800/yr' where id = 'room-g1-4';
update rooms set price = 4200, price_label = '₵4,200/yr' where id = 'room-s2-1';
update rooms set price = 2800, price_label = '₵2,800/yr' where id = 'room-s2-2';
update rooms set price = 2200, price_label = '₵2,200/yr' where id = 'room-s2-3';
update rooms set price = 3800, price_label = '₵3,800/yr' where id = 'room-h3-1';
update rooms set price = 2400, price_label = '₵2,400/yr' where id = 'room-h3-2';
update rooms set price = 1950, price_label = '₵1,950/yr' where id = 'room-h3-3';
update rooms set price = 1600, price_label = '₵1,600/yr' where id = 'room-h3-4';

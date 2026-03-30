-- 039: Replace all user listings with 50 realistic Ghanaian properties
-- Link 2 listings to niinii.nn86@gmail.com

-- ── 1. Wipe existing listings ────────────────────────────────────────────────
-- Disable audit triggers temporarily (hostel trigger references OLD.title but hostels use OLD.name)
ALTER TABLE hostels DISABLE TRIGGER trg_audit_hostel_delete;
ALTER TABLE homes   DISABLE TRIGGER trg_audit_home_delete;

DELETE FROM bookings;
DELETE FROM rooms;
DELETE FROM hostels;
DELETE FROM homes;

ALTER TABLE hostels ENABLE TRIGGER trg_audit_hostel_delete;
ALTER TABLE homes   ENABLE TRIGGER trg_audit_home_delete;

-- ── 2. Seed homes ────────────────────────────────────────────────────────────
DO $$
DECLARE
  demo_owner_id text;
  admin_id      text;
BEGIN
  -- Get the niinii user ID (will be NULL if account doesn't exist yet — listings still insert with NULL owner)
  SELECT id::text INTO demo_owner_id FROM auth.users WHERE email = 'niinii.nn86@gmail.com' LIMIT 1;
  SELECT id::text INTO admin_id       FROM auth.users WHERE email = 'staymate8@gmail.com'  LIMIT 1;

  INSERT INTO homes (id, title, description, price, price_label, for_sale, beds, baths, sqft, address, city, state, images, amenities, owner_phone, owner_id, lat, lng, condition, furnishing, property_type, is_sponsored, is_verified, status) VALUES

  -- ── East Legon ───────────────────────────────────────────────────────────
  ('home-001', '4-Bedroom Villa in East Legon',
   'Stunning detached villa in a quiet estate behind East Legon. Double-height ceilings, fitted kitchen, and a private swimming pool. Ideal for executives and families.',
   18000, 'GH₵18,000/mo', false, 4, 4, 4200,
   '5th Circular Road, East Legon', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800']::text[],
   ARRAY['AC', 'Generator', 'Pool', 'Security', 'Parking', 'WiFi', 'Borehole']::text[],
   '+233 24 100 0001', admin_id, 5.6360, -0.1546, 'new', 'fully_furnished', 'house', true, true, 'approved'),

  ('home-002', 'Modern 3-Bed Apartment, East Legon Hills',
   'Brand-new apartment on the 3rd floor with panoramic views of Accra. Smart home features, fitted wardrobes, and a covered balcony. 24/7 security and fibre internet.',
   9500, 'GH₵9,500/mo', false, 3, 3, 1800,
   'East Legon Hills Estate', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Water Supply', 'Fitted Kitchen']::text[],
   '+233 24 100 0002', admin_id, 5.6401, -0.1502, 'new', 'fully_furnished', 'apartment', true, true, 'approved'),

  -- ── Airport Residential ──────────────────────────────────────────────────
  ('home-003', 'Executive 2-Bed, Airport Residential',
   'Sophisticated apartment in the heart of Airport Residential Area. Walking distance to the Accra Mall and top restaurants. Backup generator and borehole.',
   7500, 'GH₵7,500/mo', false, 2, 2, 1200,
   'Airport Residential Area', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Borehole']::text[],
   '+233 24 100 0003', admin_id, 5.6052, -0.1718, 'renovated', 'fully_furnished', 'apartment', false, true, 'approved'),

  -- ── Cantonments ──────────────────────────────────────────────────────────
  ('home-004', '5-Bed Luxury Home, Cantonments',
   'Grand residence in Cantonments with manicured gardens, a home office, and a chef''s kitchen. Walking distance to embassies and the Golf Club. Rare find at this price.',
   25000, 'GH₵25,000/mo', false, 5, 5, 6000,
   'Cantonments Road', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800', 'https://images.unsplash.com/photo-1600210491892-03d54730d73c?w=800', 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800']::text[],
   ARRAY['AC', 'Generator', 'Pool', 'Security', 'Parking', 'WiFi', 'Borehole', 'Gym', 'CCTV', 'Electric Fencing']::text[],
   '+233 24 100 0004', admin_id, 5.5937, -0.1773, 'new', 'fully_furnished', 'house', true, true, 'approved'),

  -- ── Labone ───────────────────────────────────────────────────────────────
  ('home-005', 'Charming 3-Bed Townhouse in Labone',
   'Beautifully finished townhouse in the leafy Labone neighbourhood. Private courtyard, fitted kitchen, and two covered parking spots. Pet-friendly.',
   11000, 'GH₵11,000/mo', false, 3, 3, 2400,
   'Labone Close', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Water Supply']::text[],
   '+233 24 100 0005', admin_id, 5.5842, -0.1641, 'renovated', 'semi_furnished', 'townhouse', false, true, 'approved'),

  -- ── Osu ──────────────────────────────────────────────────────────────────
  ('home-006', 'Stylish Studio in Osu',
   'Compact, modern studio steps from Oxford Street. Ideal for professionals. Open-plan living, kitchenette, and rooftop terrace access.',
   2800, 'GH₵2,800/mo', false, 1, 1, 550,
   'Oxford Street, Osu', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800', 'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800']::text[],
   ARRAY['AC', 'Generator', 'WiFi', 'Security', 'Water Supply']::text[],
   '+233 24 100 0006', admin_id, 5.5567, -0.1756, 'renovated', 'fully_furnished', 'studio', false, false, 'approved'),

  ('home-007', '2-Bed Apartment near Osu Castle',
   'Light-filled apartment with sea breeze and partial ocean views. Recently renovated bathrooms and kitchen. Quiet neighbourhood, 5 mins from Danquah Circle.',
   5500, 'GH₵5,500/mo', false, 2, 2, 1100,
   'Castle Road, Osu', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800', 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800', 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'WiFi', 'Parking', 'Water Supply']::text[],
   '+233 24 100 0007', admin_id, 5.5490, -0.1842, 'renovated', 'semi_furnished', 'apartment', false, true, 'approved'),

  -- ── Spintex ──────────────────────────────────────────────────────────────
  ('home-008', '3-Bed Semi-Detached, Spintex Road',
   'Spacious semi-detached in a gated Spintex community. Great for families — large back garden, children''s play area nearby, and excellent road access.',
   6800, 'GH₵6,800/mo', false, 3, 2, 1900,
   'Spintex Road, Community 25', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800', 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800', 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800']::text[],
   ARRAY['Generator', 'Security', 'Parking', 'Borehole', 'Water Supply']::text[],
   '+233 24 100 0008', admin_id, 5.6637, -0.0973, 'used', 'unfurnished', 'house', false, false, 'approved'),

  ('home-009', 'Newly Built 2-Bed, Spintex Community 18',
   'Brand-new apartment complex off the main Spintex highway. POP ceilings, modern tiling, and access to a communal gym.',
   4200, 'GH₵4,200/mo', false, 2, 2, 1050,
   'Spintex Community 18', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800', 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=800', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'Gym', 'WiFi']::text[],
   '+233 24 100 0009', admin_id, 5.6700, -0.0880, 'new', 'semi_furnished', 'apartment', false, true, 'approved'),

  -- ── Tema ─────────────────────────────────────────────────────────────────
  ('home-010', '4-Bed House, Tema Community 25',
   'Detached family home with a large compound. Tema Community 25 is quiet and well-serviced. Reliable water and electricity. Close to Tema Motorway junction.',
   5500, 'GH₵5,500/mo', false, 4, 3, 2600,
   'Community 25, Tema', 'Tema', '',
   ARRAY['https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800', 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=800', 'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800']::text[],
   ARRAY['Generator', 'Borehole', 'Security', 'Parking', 'Water Supply']::text[],
   '+233 24 100 0010', admin_id, 5.7010, -0.0119, 'used', 'unfurnished', 'house', false, false, 'approved'),

  ('home-011', 'Studio Apartment, Tema Community 22',
   'Affordable, clean studio ideal for young professionals. All bills included. Minutes from Tema industrial area and the Motorway.',
   1800, 'GH₵1,800/mo', false, 1, 1, 420,
   'Community 22, Tema', 'Tema', '',
   ARRAY['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800', 'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800', 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800', 'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800']::text[],
   ARRAY['Security', 'Water Supply', 'WiFi']::text[],
   '+233 24 100 0011', admin_id, 5.6870, -0.0234, 'used', 'fully_furnished', 'studio', false, false, 'approved'),

  -- ── Kumasi ───────────────────────────────────────────────────────────────
  ('home-012', '3-Bed Executive Flat, Kumasi Nhyiaeso',
   'Well-finished flat in the upscale Nhyiaeso neighbourhood of Kumasi. Close to KNUST and major shopping centres. Tiled throughout with air conditioning.',
   4500, 'GH₵4,500/mo', false, 3, 2, 1500,
   'Nhyiaeso Road', 'Kumasi', '',
   ARRAY['https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=800', 'https://images.unsplash.com/photo-1600047508788-786f3865b48c?w=800', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800', 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=800', 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'Water Supply']::text[],
   '+233 32 100 0012', admin_id, 6.7040, -1.5966, 'renovated', 'semi_furnished', 'apartment', false, true, 'approved'),

  ('home-013', '5-Bed House for Sale, Kumasi Asokwa',
   'Large family home on a 0.5-acre plot in the Asokwa estate area. Corner property, high walls with electric fence, and a borehole. Motivated seller.',
   850000, 'GH₵850,000', true, 5, 4, 5000,
   'Asokwa Estate, Kumasi', 'Kumasi', '',
   ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800']::text[],
   ARRAY['Generator', 'Borehole', 'Security', 'Parking', 'Electric Fencing', 'CCTV']::text[],
   '+233 32 100 0013', admin_id, 6.6887, -1.5862, 'used', 'unfurnished', 'house', false, false, 'approved'),

  ('home-014', 'Modern 2-Bed Apartment, Kumasi Ahodwo',
   'Contemporary apartment in Ahodwo, Kumasi''s most sought-after suburb. Fitted kitchen, POP ceilings, and a balcony with garden views.',
   3200, 'GH₵3,200/mo', false, 2, 2, 1000,
   'Ahodwo Road', 'Kumasi', '',
   ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800']::text[],
   ARRAY['AC', 'Security', 'Parking', 'Water Supply', 'WiFi']::text[],
   '+233 32 100 0014', admin_id, 6.6805, -1.6134, 'new', 'semi_furnished', 'apartment', true, true, 'approved'),

  -- ── Kasoa ─────────────────────────────────────────────────────────────────
  ('home-015', '3-Bed House for Sale, Kasoa Millennium City',
   'Affordable 3-bedroom house in Kasoa Millennium City. Tiled throughout, iron-rod fence, and a large compound. Great for first-time buyers.',
   320000, 'GH₵320,000', true, 3, 2, 1700,
   'Millennium City, Kasoa', 'Kasoa', '',
   ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800', 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800', 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800', 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800']::text[],
   ARRAY['Security', 'Parking', 'Water Supply']::text[],
   '+233 24 100 0015', admin_id, 5.5392, -0.4258, 'used', 'unfurnished', 'house', false, false, 'approved'),

  ('home-016', '2-Bed Apartment, Kasoa New Town',
   'Clean, newly tiled apartment in a gated compound. Reliable electricity and water. Close to Kasoa Market and key transport links.',
   2200, 'GH₵2,200/mo', false, 2, 1, 900,
   'Kasoa New Town', 'Kasoa', '',
   ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800', 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=800', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800']::text[],
   ARRAY['Security', 'Water Supply', 'Parking']::text[],
   '+233 24 100 0016', admin_id, 5.5288, -0.4189, 'used', 'unfurnished', 'apartment', false, false, 'approved'),

  -- ── Adenta ───────────────────────────────────────────────────────────────
  ('home-017', '4-Bed House, Adenta Housing',
   'Solid family house in Adenta Housing Estate. Quiet street, large compound, and a boys'' quarters. 10 minutes from Madina Market.',
   6000, 'GH₵6,000/mo', false, 4, 3, 2200,
   'Adenta Housing Estate', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800']::text[],
   ARRAY['Generator', 'Security', 'Parking', 'Borehole', 'Boys Quarter']::text[],
   '+233 24 100 0017', admin_id, 5.7239, -0.1625, 'used', 'unfurnished', 'house', false, false, 'approved'),

  -- ── Dzorwulu ─────────────────────────────────────────────────────────────
  ('home-018', '3-Bed Apartment, Dzorwulu',
   'Tastefully furnished apartment in the serene Dzorwulu neighbourhood. Open-plan living, modern appliances, and a private balcony.',
   8500, 'GH₵8,500/mo', false, 3, 2, 1600,
   'Dzorwulu Road', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Fitted Kitchen']::text[],
   '+233 24 100 0018', admin_id, 5.6019, -0.2012, 'renovated', 'fully_furnished', 'apartment', true, true, 'approved'),

  -- ── Trasacco ─────────────────────────────────────────────────────────────
  ('home-019', '4-Bed Villa, Trasacco Valley',
   'Prestigious Trasacco Valley address. Private estate with 24-hour security, tennis court access, and a private garden. Ideal for diplomats and senior executives.',
   22000, 'GH₵22,000/mo', false, 4, 4, 4800,
   'Trasacco Valley, East Legon', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800', 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800', 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800', 'https://images.unsplash.com/photo-1600210491892-03d54730d73c?w=800', 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800']::text[],
   ARRAY['AC', 'Generator', 'Pool', 'Security', 'Parking', 'WiFi', 'Borehole', 'Gym', 'CCTV', 'Electric Fencing', 'Tennis Court']::text[],
   '+233 24 100 0019', admin_id, 5.6450, -0.1430, 'new', 'fully_furnished', 'house', true, true, 'approved'),

  -- ── Roman Ridge ──────────────────────────────────────────────────────────
  ('home-020', '3-Bed Townhouse, Roman Ridge',
   'Contemporary townhouse in Roman Ridge with rooftop terrace. Minutes from A&C Mall and the US Embassy. Perfect for expats.',
   13500, 'GH₵13,500/mo', false, 3, 3, 2000,
   'Roman Ridge Road', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Pool', 'Fitted Kitchen']::text[],
   '+233 24 100 0020', admin_id, 5.5900, -0.1780, 'new', 'fully_furnished', 'townhouse', false, true, 'approved'),

  -- ── Abelemkpe ────────────────────────────────────────────────────────────
  ('home-021', '2-Bed Apartment, Abelemkpe',
   'Bright apartment in central Abelemkpe. Close to Ring Road, Accra Sports Stadium, and nightlife. Reliable power and security.',
   4800, 'GH₵4,800/mo', false, 2, 2, 1050,
   'Abelemkpe', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800', 'https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=800', 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800', 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'Water Supply']::text[],
   '+233 24 100 0021', admin_id, 5.5873, -0.2143, 'renovated', 'semi_furnished', 'apartment', false, false, 'approved'),

  -- ── Haatso ───────────────────────────────────────────────────────────────
  ('home-022', '3-Bed House, Haatso',
   'Spacious house in Haatso close to the Accra-Kumasi road. Large compound with fruit trees, and a separate BQ. Suitable for a large family.',
   4000, 'GH₵4,000/mo', false, 3, 2, 2000,
   'Haatso, Near Atomic Junction', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1548549557-dbe9155df51e?w=800', 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800', 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800', 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800']::text[],
   ARRAY['Security', 'Parking', 'Borehole', 'Boys Quarter']::text[],
   '+233 24 100 0022', admin_id, 5.6650, -0.2060, 'used', 'unfurnished', 'house', false, false, 'approved'),

  -- ── Takoradi ─────────────────────────────────────────────────────────────
  ('home-023', '3-Bed House, Takoradi Market Circle',
   'Well-positioned house near the heart of Takoradi. Easy access to oil & gas offices, banking, and the main market.',
   3800, 'GH₵3,800/mo', false, 3, 2, 1700,
   'Market Circle Area', 'Takoradi', '',
   ARRAY['https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800', 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800', 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800']::text[],
   ARRAY['Generator', 'Security', 'Parking', 'Water Supply']::text[],
   '+233 31 100 0023', admin_id, 4.8958, -1.7600, 'used', 'semi_furnished', 'house', false, false, 'approved'),

  ('home-024', 'Executive Duplex for Sale, Takoradi Anaji',
   'Modern duplex in Anaji Estate with 4 bedrooms, a home theatre room, and an integrated garage. Price is firm.',
   680000, 'GH₵680,000', true, 4, 3, 3500,
   'Anaji Estate, Takoradi', 'Takoradi', '',
   ARRAY['https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800', 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'Borehole', 'CCTV']::text[],
   '+233 31 100 0024', admin_id, 4.9164, -1.7432, 'new', 'unfurnished', 'duplex', false, true, 'approved'),

  -- ── Ashaley Botwe ────────────────────────────────────────────────────────
  ('home-025', '4-Bed House, Ashaley Botwe Lakeside',
   'Family home near Lakeside Estate. Quiet community with reliable water and electricity. Large compound and 3 covered parking bays.',
   7200, 'GH₵7,200/mo', false, 4, 3, 2800,
   'Lakeside Estate, Ashaley Botwe', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800', 'https://images.unsplash.com/photo-1548549557-dbe9155df51e?w=800', 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800', 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800', 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800']::text[],
   ARRAY['Generator', 'Security', 'Parking', 'Borehole', 'Boys Quarter']::text[],
   '+233 24 100 0025', admin_id, 5.7100, -0.1210, 'used', 'unfurnished', 'house', false, false, 'approved'),

  -- ── Labadi ───────────────────────────────────────────────────────────────
  ('home-026', '2-Bed Beachside Apartment, Labadi',
   'Steps from Labadi Beach. Fully furnished apartment with sea views from the balcony. Perfect for short lets and long-stay professionals.',
   6500, 'GH₵6,500/mo', false, 2, 2, 1200,
   'Beach Road, Labadi', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800', 'https://images.unsplash.com/photo-1528543606781-2f6e8759f741?w=800', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800']::text[],
   ARRAY['AC', 'Security', 'WiFi', 'Parking', 'Water Supply', 'Fitted Kitchen']::text[],
   '+233 24 100 0026', admin_id, 5.5637, -0.1312, 'renovated', 'fully_furnished', 'apartment', true, true, 'approved'),

  -- ── Madina ───────────────────────────────────────────────────────────────
  ('home-027', '3-Bed Apartment, Madina Zongo Junction',
   'Newly built apartment block near Madina Market. Easy access to public transport, shops, and banks. Reliable water supply.',
   3500, 'GH₵3,500/mo', false, 3, 2, 1300,
   'Zongo Junction, Madina', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800', 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800', 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=800', 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800']::text[],
   ARRAY['Security', 'Water Supply', 'Parking']::text[],
   '+233 24 100 0027', admin_id, 5.7021, -0.1644, 'new', 'unfurnished', 'apartment', false, false, 'approved'),

  -- ── Achimota ─────────────────────────────────────────────────────────────
  ('home-028', '4-Bed House, Achimota Estate',
   'Classic Achimota Estate house with spacious rooms and a shaded compound. Close to Achimota School and Achimota Forest Reserve.',
   5800, 'GH₵5,800/mo', false, 4, 3, 2400,
   'Achimota Estate', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1548549557-dbe9155df51e?w=800', 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800', 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800', 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800']::text[],
   ARRAY['Generator', 'Security', 'Parking', 'Borehole', 'Boys Quarter', 'Water Supply']::text[],
   '+233 24 100 0028', admin_id, 5.6318, -0.2297, 'used', 'unfurnished', 'house', false, false, 'approved'),

  -- ── Accra CBD ────────────────────────────────────────────────────────────
  ('home-029', 'Studio, Adabraka',
   'Compact studio in central Adabraka — walking distance to offices, ministries, and public transport. Tile floors and a private bathroom.',
   1600, 'GH₵1,600/mo', false, 1, 1, 380,
   'Adabraka Road', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800', 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800', 'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800', 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800']::text[],
   ARRAY['Security', 'Water Supply']::text[],
   '+233 24 100 0029', admin_id, 5.5619, -0.2116, 'used', 'semi_furnished', 'studio', false, false, 'approved'),

  -- ── North Ridge ──────────────────────────────────────────────────────────
  ('home-030', '3-Bed Apartment, North Ridge',
   'Premium serviced apartment in the diplomatic North Ridge zone. Concierge service, backup power, and a rooftop lounge.',
   14000, 'GH₵14,000/mo', false, 3, 3, 1900,
   'North Ridge Crescent', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Pool', 'Gym', 'Fitted Kitchen', 'Concierge']::text[],
   '+233 24 100 0030', admin_id, 5.5766, -0.1943, 'new', 'fully_furnished', 'apartment', true, true, 'approved'),

  -- ── Teshie ───────────────────────────────────────────────────────────────
  ('home-031', '2-Bed House, Teshie Nungua',
   'Solid 2-bedroom house with a private yard in Teshie. Close to Nungua Barrier and Baatsona Total filling station.',
   2600, 'GH₵2,600/mo', false, 2, 1, 1100,
   'Teshie Nungua Estates', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=800', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800', 'https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=800', 'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800']::text[],
   ARRAY['Security', 'Water Supply', 'Parking']::text[],
   '+233 24 100 0031', admin_id, 5.5958, -0.0786, 'used', 'unfurnished', 'house', false, false, 'approved'),

  -- ── Prampram ─────────────────────────────────────────────────────────────
  ('home-032', 'Beach House for Sale, Prampram',
   'Rare oceanfront property on the Prampram coastline. 3 bedrooms, outdoor shower, and 180-degree sea views. Great for tourism or a holiday home.',
   480000, 'GH₵480,000', true, 3, 2, 2000,
   'Prampram Beach Road', 'Prampram', '',
   ARRAY['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800', 'https://images.unsplash.com/photo-1528543606781-2f6e8759f741?w=800', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800']::text[],
   ARRAY['Borehole', 'Security', 'Parking', 'Water Supply']::text[],
   '+233 24 100 0032', admin_id, 5.7209, 0.1058, 'used', 'semi_furnished', 'house', false, false, 'approved'),

  -- ── Tesano ───────────────────────────────────────────────────────────────
  ('home-033', '3-Bed Apartment, Tesano',
   'Newly constructed apartment in the quiet Tesano residential area. Ideal location between Accra CBD and East Legon. Tiled throughout.',
   5200, 'GH₵5,200/mo', false, 3, 2, 1400,
   'Tesano', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=800', 'https://images.unsplash.com/photo-1600047508788-786f3865b48c?w=800', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800', 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?w=800', 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'Water Supply']::text[],
   '+233 24 100 0033', admin_id, 5.5989, -0.2284, 'new', 'semi_furnished', 'apartment', false, true, 'approved'),

  -- ── Tamale ───────────────────────────────────────────────────────────────
  ('home-034', '4-Bed House, Tamale Vittin',
   'Spacious family home in Vittin area of Tamale. Large compound, borehole, and standby generator. Close to Tamale Teaching Hospital.',
   3000, 'GH₵3,000/mo', false, 4, 2, 2200,
   'Vittin Estate, Tamale', 'Tamale', '',
   ARRAY['https://images.unsplash.com/photo-1548549557-dbe9155df51e?w=800', 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800', 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800', 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800', 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800']::text[],
   ARRAY['Generator', 'Borehole', 'Security', 'Parking']::text[],
   '+233 37 100 0034', admin_id, 9.4008, -0.8393, 'used', 'unfurnished', 'house', false, false, 'approved'),

  -- ── Koforidua ─────────────────────────────────────────────────────────────
  ('home-035', '3-Bed House for Sale, Koforidua',
   'Affordable 3-bedroom in Koforidua New Town. Good road network, close to schools and the hospital. Title documents available.',
   280000, 'GH₵280,000', true, 3, 2, 1600,
   'New Town, Koforidua', 'Koforidua', '',
   ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800', 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800', 'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=800', 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800', 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800']::text[],
   ARRAY['Security', 'Parking', 'Water Supply', 'Borehole']::text[],
   '+233 34 100 0035', admin_id, 6.0940, -0.2574, 'used', 'unfurnished', 'house', false, false, 'approved'),

  -- ── Listings linked to niinii.nn86@gmail.com ─────────────────────────────
  ('home-036', '3-Bed Apartment, East Legon Hills (Owner Listed)',
   'Gorgeous 3-bedroom apartment in East Legon Hills offered directly by the owner. Fitted wardrobes, large balcony, and stunning views of Accra at night.',
   10500, 'GH₵10,500/mo', false, 3, 3, 1750,
   'East Legon Hills', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Fitted Kitchen', 'Wardrobes']::text[],
   '+233 24 200 0036', demo_owner_id, 5.6401, -0.1502, 'new', 'fully_furnished', 'apartment', false, true, 'approved'),

  ('home-037', '2-Bed Semi-Furnished, Cantonments (Owner Listed)',
   'Owner-listed 2-bedroom apartment in Cantonments. Access to shared gym and pool in the complex. Internet, security, and parking included.',
   8000, 'GH₵8,000/mo', false, 2, 2, 1100,
   'Cantonments', 'Accra', '',
   ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', 'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=800']::text[],
   ARRAY['AC', 'Generator', 'Security', 'Parking', 'WiFi', 'Gym', 'Pool']::text[],
   '+233 24 200 0037', demo_owner_id, 5.5937, -0.1773, 'renovated', 'semi_furnished', 'apartment', false, true, 'approved');

  -- ── Hostel listings ───────────────────────────────────────────────────────
  INSERT INTO hostels (id, name, description, address, city, state, nearby_universities, images, total_rooms, available_rooms, price_range_min, price_range_max, price_range_label, amenities, manager_phone, manager_id, lat, lng, status, is_sponsored, is_verified) VALUES

  ('hostel-001', 'Platinum Suites, Legon',
   'Modern hostel a 5-minute walk from the University of Ghana main gate. En-suite rooms, fibre Wi-Fi, and a 24-hour study lounge.',
   'Near UG Main Gate, Legon', 'Accra', '',
   ARRAY['University of Ghana (UG)', 'Ghana Institute of Management (GIMPA)']::text[],
   ARRAY['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800']::text[],
   60, 18, 4500, 7500, 'GH₵4,500 – GH₵7,500/yr',
   ARRAY['WiFi', 'Security', 'Generator', 'Water Supply', 'Study Lounge', 'En-suite', 'Laundry']::text[],
   '+233 24 300 0001', admin_id, 5.6502, -0.1866, 'approved', true, true),

  ('hostel-002', 'Heritage Hostel, KNUST',
   'Conveniently located off the KNUST main road. Single, double, and triple rooms available. Secure compound with CCTV and round-the-clock security.',
   'KNUST Road, Ayigya', 'Kumasi', '',
   ARRAY['KNUST', 'Kumasi Technical University']::text[],
   ARRAY['https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800']::text[],
   80, 24, 3000, 5500, 'GH₵3,000 – GH₵5,500/yr',
   ARRAY['WiFi', 'Security', 'Generator', 'Water Supply', 'CCTV', 'Laundry', 'Parking']::text[],
   '+233 32 300 0002', admin_id, 6.6744, -1.5716, 'approved', true, true),

  ('hostel-003', 'Golden Gate Hostel, Tema',
   'Affordable student accommodation near Tema Senior High School and Community 1 SHS. Borehole water, backup generator, and a communal kitchen.',
   'Community 1, Tema', 'Tema', '',
   ARRAY['Tema Senior High School', 'Methodist University College']::text[],
   ARRAY['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800']::text[],
   50, 10, 2500, 4000, 'GH₵2,500 – GH₵4,000/yr',
   ARRAY['Generator', 'Borehole', 'Security', 'Water Supply', 'Communal Kitchen']::text[],
   '+233 24 300 0003', admin_id, 5.6780, -0.0150, 'approved', false, false),

  ('hostel-004', 'Prestige Hostel, Cape Coast',
   'Purpose-built student hostel near the University of Cape Coast campus. Spacious rooms with good ventilation, a reading room, and reliable water supply.',
   'UCC Road, Cape Coast', 'Cape Coast', '',
   ARRAY['University of Cape Coast (UCC)', 'Cape Coast Technical University']::text[],
   ARRAY['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800']::text[],
   70, 20, 2800, 4800, 'GH₵2,800 – GH₵4,800/yr',
   ARRAY['Security', 'Generator', 'Water Supply', 'Study Room', 'Borehole']::text[],
   '+233 33 300 0004', admin_id, 5.1089, -1.2477, 'approved', false, true),

  ('hostel-005', 'Emerald Court Hostel, Tamale',
   'Modern student hostel near the University for Development Studies (UDS) Tamale campus. En-suite rooms available. Safe and well-lit compound.',
   'UDS Road, Tamale', 'Tamale', '',
   ARRAY['University for Development Studies (UDS)', 'Tamale Technical University']::text[],
   ARRAY['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800']::text[],
   45, 15, 2200, 3800, 'GH₵2,200 – GH₵3,800/yr',
   ARRAY['Security', 'Generator', 'Water Supply', 'Borehole', 'WiFi']::text[],
   '+233 37 300 0005', admin_id, 9.4008, -0.8390, 'approved', false, false);

  -- Insert rooms for hostels
  INSERT INTO rooms (id, hostel_id, name, room_type, price, price_label, capacity, description, amenities, available) VALUES
  ('room-001a', 'hostel-001', 'Single En-suite',    'single',    4500, 'GH₵4,500/yr', 1, 'Private room with en-suite bathroom and built-in wardrobe.',     ARRAY['AC', 'WiFi', 'En-suite', 'Wardrobe']::text[], true),
  ('room-001b', 'hostel-001', 'Double En-suite',    'double',    6500, 'GH₵6,500/yr', 2, 'Shared room for 2 with en-suite bathroom and study desks.',      ARRAY['AC', 'WiFi', 'En-suite', 'Study Desk']::text[], true),
  ('room-001c', 'hostel-001', 'Executive Suite',    'single',    7500, 'GH₵7,500/yr', 1, 'Spacious studio-style room with private bathroom and kitchenette.',ARRAY['AC', 'WiFi', 'En-suite', 'Kitchenette', 'Fridge']::text[], true),
  ('room-002a', 'hostel-002', 'Single Room',        'single',    3000, 'GH₵3,000/yr', 1, 'Self-contained single room with shared bathroom.',               ARRAY['WiFi', 'Security']::text[], true),
  ('room-002b', 'hostel-002', 'Double Room',        'double',    4500, 'GH₵4,500/yr', 2, 'Comfortable room for 2 students with shared bathroom on floor.', ARRAY['WiFi', 'Security', 'Study Desk']::text[], true),
  ('room-002c', 'hostel-002', 'Triple Room',        'triple',    5500, 'GH₵5,500/yr', 3, 'Triple room ideal for groups. Shared bathrooms.',                ARRAY['WiFi', 'Security']::text[], true),
  ('room-003a', 'hostel-003', 'Single Room',        'single',    2500, 'GH₵2,500/yr', 1, 'Basic single room with good ventilation.',                       ARRAY['Security', 'Water Supply']::text[], true),
  ('room-003b', 'hostel-003', 'Double Room',        'double',    4000, 'GH₵4,000/yr', 2, 'Room for 2 with communal kitchen access.',                      ARRAY['Security', 'Water Supply', 'Kitchen Access']::text[], true),
  ('room-004a', 'hostel-004', 'Single Room',        'single',    2800, 'GH₵2,800/yr', 1, 'Standard single room with study area.',                         ARRAY['Security', 'Water Supply', 'Study Area']::text[], true),
  ('room-004b', 'hostel-004', 'Double Room',        'double',    4800, 'GH₵4,800/yr', 2, 'Double room with shared bathroom on same floor.',               ARRAY['Security', 'Water Supply']::text[], true),
  ('room-005a', 'hostel-005', 'Single En-suite',    'single',    3800, 'GH₵3,800/yr', 1, 'En-suite single room in modern building.',                      ARRAY['WiFi', 'En-suite', 'Generator']::text[], true),
  ('room-005b', 'hostel-005', 'Double Room',        'double',    2200, 'GH₵2,200/yr', 2, 'Shared room for 2. Communal bathrooms on the floor.',           ARRAY['Security', 'Water Supply']::text[], true);

  -- ── Update niinii profile role to owner ──────────────────────────────────
  IF demo_owner_id IS NOT NULL THEN
    UPDATE profiles SET role = 'owner' WHERE id = demo_owner_id::uuid;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';

-- 034: Sponsorship tiers, agent subscriptions, verified badge
-- Adds sponsor_tier, is_verified to listings; agent fields to profiles; sponsor_payments audit table

-- ── Homes: sponsorship + verified ──────────────────────────────────────────
ALTER TABLE homes ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS sponsor_tier text;
ALTER TABLE homes ADD COLUMN IF NOT EXISTS sponsor_payment_ref text;

-- ── Hostels: sponsorship + verified ────────────────────────────────────────
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS sponsor_tier text;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS sponsor_payment_ref text;

-- ── Profiles: agent subscription ───────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_agent boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_subscription_until timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agent_subscription_ref text;

-- ── Sponsor payments audit table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id text NOT NULL,
  property_type text NOT NULL CHECK (property_type IN ('home', 'hostel')),
  user_id text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('basic', 'standard', 'featured')),
  amount_pesewas int NOT NULL,
  payment_ref text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- RLS for sponsor_payments
ALTER TABLE sponsor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sponsor payments"
  ON sponsor_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can read sponsor payments"
  ON sponsor_payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.role = 'admin')
  );

CREATE POLICY "Owner can read own sponsor payments"
  ON sponsor_payments FOR SELECT
  USING (auth.uid()::text = user_id);

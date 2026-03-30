-- ============================================================
-- 045: Reviews, view tracking, saved searches
-- ============================================================

-- 1. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid REFERENCES bookings(id) ON DELETE CASCADE,
  property_id text NOT NULL,
  property_type text NOT NULL DEFAULT 'home', -- 'home' | 'hostel'
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Reviewer can insert once per booking"
  ON reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewer can delete own review"
  ON reviews FOR DELETE TO authenticated
  USING (auth.uid() = reviewer_id);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_booking_unique ON reviews(booking_id);

-- 2. View tracking on homes + hostels
ALTER TABLE homes   ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;
ALTER TABLE hostels ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- RPC to safely increment view count (bypasses RLS)
CREATE OR REPLACE FUNCTION increment_view(p_table text, p_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_table = 'homes' THEN
    UPDATE homes SET view_count = view_count + 1 WHERE id = p_id;
  ELSIF p_table = 'hostels' THEN
    UPDATE hostels SET view_count = view_count + 1 WHERE id = p_id;
  END IF;
END;
$$;

-- 3. Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  filters     jsonb NOT NULL DEFAULT '{}'::jsonb,
  property_type text NOT NULL DEFAULT 'home', -- 'home' | 'hostel'
  notify      boolean NOT NULL DEFAULT true,
  last_alerted_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved searches"
  ON saved_searches FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Enable realtime on reviews
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

NOTIFY pgrst, 'reload schema';

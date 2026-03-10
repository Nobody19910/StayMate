-- 022_property_anchored_chat.sql
-- Adds property context to conversations for the "Property-Anchored" chat system

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS property_id   TEXT,
  ADD COLUMN IF NOT EXISTS property_type TEXT,         -- 'home' | 'hostel' | 'room'
  ADD COLUMN IF NOT EXISTS property_title TEXT,
  ADD COLUMN IF NOT EXISTS property_image TEXT;        -- first image URL

-- Allow seekers to update these fields on their own conversation
CREATE POLICY "Seekers can update their own conversation property context"
  ON conversations FOR UPDATE
  USING (auth.uid() = seeker_id)
  WITH CHECK (auth.uid() = seeker_id);

-- ─── Create listing-images storage bucket ────────────────────────────────────
-- Run this in the Supabase dashboard > Storage or via CLI

-- insert into storage.buckets (id, name, public) values ('listing-images', 'listing-images', true)
-- on conflict (id) do nothing;

-- Allow authenticated users to upload
-- create policy "Auth users can upload listing images"
--   on storage.objects for insert
--   with check (bucket_id = 'listing-images' AND auth.role() = 'authenticated');

-- Allow public read
-- create policy "Public can read listing images"
--   on storage.objects for select
--   using (bucket_id = 'listing-images');

-- NOTE: Storage bucket and policies must be created via the Supabase dashboard
-- or the Supabase CLI (supabase storage create listing-images --public)
-- SQL above is shown for reference only — storage.buckets is not accessible via SQL in all plans.

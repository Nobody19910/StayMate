-- 1. Create the Storage Bucket (if it doesn't already exist)
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- 2. Add Insert Policy for rooms (so that managers can create rooms for their hostels)
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'rooms' and policyname = 'Managers can insert rooms') then
    create policy "Managers can insert rooms" on rooms for insert with check (
      exists (
        select 1 from hostels where hostels.id = rooms.hostel_id and hostels.manager_id = auth.uid()::text
      )
    );
  end if;
end $$;

-- 3. Storage Policies
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'Auth users can upload listing images') then
    create policy "Auth users can upload listing images"
      on storage.objects for insert
      with check (bucket_id = 'listing-images' AND auth.role() = 'authenticated');
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'objects' and schemaname = 'storage' and policyname = 'Public can read listing images') then
    create policy "Public can read listing images"
      on storage.objects for select
      using (bucket_id = 'listing-images');
  end if;
end $$;

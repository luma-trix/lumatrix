-- Nexa V7: profile-picture storage
-- Run once after v6_complete_update.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media','profile-media',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'])
on conflict (id) do update set
  public=true,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Anyone views profile pictures" on storage.objects;
create policy "Anyone views profile pictures" on storage.objects
for select using (bucket_id='profile-media');

drop policy if exists "Users upload own profile pictures" on storage.objects;
create policy "Users upload own profile pictures" on storage.objects
for insert to authenticated
with check (bucket_id='profile-media' and (storage.foldername(name))[1]=auth.uid()::text);

drop policy if exists "Users update own profile pictures" on storage.objects;
create policy "Users update own profile pictures" on storage.objects
for update to authenticated
using (bucket_id='profile-media' and owner_id=auth.uid()::text);

drop policy if exists "Users delete own profile pictures" on storage.objects;
create policy "Users delete own profile pictures" on storage.objects
for delete to authenticated
using (bucket_id='profile-media' and owner_id=auth.uid()::text);

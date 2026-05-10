-- Add optional avatar path for students
alter table public.students
add column if not exists avatar_path text;

-- Create avatars bucket (public read)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Storage policies for avatars:
-- - Anyone can read (bucket is public; this policy is extra safety)
-- - Only the logged-in user can write/delete objects under `${auth.uid()}/...`
do $$
begin
  -- Select for all
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_public_read'
  ) then
    create policy avatars_public_read
      on storage.objects
      for select
      using (bucket_id = 'avatars');
  end if;

  -- Insert only into own folder
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_insert'
  ) then
    create policy avatars_owner_insert
      on storage.objects
      for insert
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  -- Update only in own folder
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_update'
  ) then
    create policy avatars_owner_update
      on storage.objects
      for update
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  -- Delete only in own folder
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_owner_delete'
  ) then
    create policy avatars_owner_delete
      on storage.objects
      for delete
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end $$;


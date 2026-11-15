-- Profile photos in Supabase Storage.
--   * Bucket "avatars" (private). Each teacher's photo lives at "<user id>/<timestamp>.jpg".
--     The timestamp changes on every upload, so other phones can tell a new photo from
--     the one they already have and caches never serve a stale picture.
--   * teachers.photo_path points at the current object (null = no photo).
--   * Teachers read and write only their own folder; the owner can read every photo.
-- These are the teacher's own profile pictures, not learners' papers (spec §7.3, §9 still hold).
--
-- Safe to run more than once.

-- ── Bucket ──────────────────────────────────────────────────────────────────
-- The app uploads a 320px JPEG (~20–30 KB); 2 MB leaves room without allowing abuse.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ── Profile column ──────────────────────────────────────────────────────────
alter table public.teachers add column if not exists photo_path text;

alter table public.teachers drop constraint if exists teachers_photo_path_check;
alter table public.teachers add constraint teachers_photo_path_check check (
  photo_path is null
  or (char_length(photo_path) <= 200 and starts_with(photo_path, id::text || '/'))
);

comment on column public.teachers.photo_path is 'Object path of the profile photo in the "avatars" bucket, or null.';

grant update (photo_path) on public.teachers to authenticated;

-- ── Storage policies ────────────────────────────────────────────────────────
-- The first folder of the object name must be the signed-in teacher's id.
drop policy if exists "Teachers read own avatar; owner reads all" on storage.objects;
create policy "Teachers read own avatar; owner reads all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_owner()))
  );

drop policy if exists "Teachers upload own avatar" on storage.objects;
create policy "Teachers upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Teachers replace own avatar" on storage.objects;
create policy "Teachers replace own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Teachers delete own avatar" on storage.objects;
create policy "Teachers delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

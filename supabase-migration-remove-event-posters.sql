-- Permanently remove the event poster column without touching other media.
-- IMPORTANT: Open Calendar Management once while signed in before running this.
-- The application deletes event poster files through the Supabase Storage API;
-- Supabase intentionally blocks direct DELETE statements on storage.objects.

begin;

update public.events
set poster_url = null
where poster_url is not null;

alter table public.events
drop column if exists poster_url;

commit;

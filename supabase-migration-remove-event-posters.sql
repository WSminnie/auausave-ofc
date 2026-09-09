-- Permanently remove the event poster column without touching other media.
-- Idempotent cleanup for databases created before event posters were retired.
-- Poster media objects, if any remain, are managed separately in Storage.

begin;

alter table public.events
drop column if exists poster_url;

commit;

-- Allow one schedule entry to belong to multiple artists while keeping
-- artist_id as the backwards-compatible primary artist.
alter table public.events
  add column if not exists artist_ids text[] not null default '{}';

update public.events
set artist_ids = array[artist_id]
where cardinality(artist_ids) = 0
  and artist_id is not null;

create index if not exists events_artist_ids_idx
  on public.events using gin (artist_ids);

-- Applied via Supabase migration; version matches the remote migration history.
alter table public.series_media drop constraint series_media_type_check;
alter table public.series_media add constraint series_media_type_check check (type in ('TRAILER','TEASER','PILOT','OST','MV','BTS','REACTION','SPECIAL','POSTER','OTHER'));

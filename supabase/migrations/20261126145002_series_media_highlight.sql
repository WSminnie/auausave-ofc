-- Extend Media type while preserving every existing supported value.
alter table public.series_media
  drop constraint series_media_type_check,
  add constraint series_media_type_check check (
    type in ('TRAILER','TEASER','PILOT','OST','MV','BTS','REACTION','HIGHLIGHT','SPECIAL','POSTER','OTHER')
  );

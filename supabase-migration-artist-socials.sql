-- Run once in Supabase Dashboard > SQL Editor.
set role postgres;

alter table public.artists
  add column if not exists social_links jsonb not null default '[]'::jsonb;

comment on column public.artists.social_links is
  'Ordered Official Socials array: platform, username, url, active, order.';

-- Optional fan participation conditions for each event.
-- Existing events stay unspecified until an administrator edits them.
alter table public.events
  add column if not exists participation jsonb not null default '{}'::jsonb;

comment on column public.events.participation is
  'Optional fan conditions: access (closed/open/private/surrounding), gathering and gifts booleans. Empty object means unspecified.';

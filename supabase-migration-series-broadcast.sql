-- Series Broadcast: additive migration, safe for existing Series and Schedule data.
set role postgres;

alter table public.series
  add column if not exists broadcasts jsonb not null default '[]'::jsonb;

alter table public.events
  add column if not exists schedule_type text,
  add column if not exists episode integer,
  add column if not exists broadcasts jsonb not null default '[]'::jsonb;

insert into public.event_types(id,name,sort_order)
values ('series_broadcast','Series Broadcast',7)
on conflict (id) do update set name=excluded.name,sort_order=excluded.sort_order;

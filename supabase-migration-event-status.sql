-- Keep postponed/canceled schedules visible without counting them in Dashboard.
alter table public.events add column if not exists event_status text not null
  default 'scheduled' check (event_status in ('scheduled','postponed','canceled'));
comment on column public.events.event_status is
  'scheduled (default), postponed or canceled. Dashboard excludes postponed and canceled.';

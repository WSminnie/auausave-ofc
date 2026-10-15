-- Additive migration. Raw telemetry is private; only aggregated reports are exposed.
create schema if not exists analytics_private;
revoke all on schema analytics_private from public;
grant usage on schema analytics_private to anon, authenticated;

create table analytics_private.readers (
  user_id uuid primary key references auth.users(id) on delete cascade
);
-- Reader access is granted explicitly by a database administrator after deployment.
-- No account automatically receives access merely for signing up or confirming email.
-- The owner explicitly approved access for ALL existing admin accounts on 2026-10-15.
-- This site currently treats its three existing confirmed non-anonymous accounts as admins.
-- Snapshot those accounts only; future signups do not receive access automatically.
insert into analytics_private.readers(user_id)
select id from auth.users where email_confirmed_at is not null and is_anonymous is not true;
alter table analytics_private.readers enable row level security;
revoke all on analytics_private.readers from public, anon, authenticated;

create table analytics_private.settings (
  id boolean primary key default true check(id),
  started_at timestamptz not null default now()
);
insert into analytics_private.settings(id) values(true);
alter table analytics_private.settings enable row level security;
revoke all on analytics_private.settings from public, anon, authenticated;

create table analytics_private.page_views (
  event_id uuid primary key,
  visitor_id uuid not null,
  page text not null check(page in ('home','schedule','series','projects','presenters','awards','artists')),
  viewed_at timestamptz not null default now()
);
create index analytics_views_time on analytics_private.page_views(viewed_at);
create index analytics_views_visitor_time on analytics_private.page_views(visitor_id, viewed_at desc);
alter table analytics_private.page_views enable row level security;
revoke all on analytics_private.page_views from public, anon, authenticated;

-- Intentional anonymous write-only endpoint: callers cannot choose the timestamp,
-- read identifiers, update events or delete events. Privileged code stays private.
create function analytics_private.record_view(p_event_id uuid,p_visitor_id uuid,p_page text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_event_id is null or p_visitor_id is null or p_page is null
     or p_page not in ('home','schedule','series','projects','presenters','awards','artists') then
    raise exception 'Invalid analytics event' using errcode='22023';
  end if;
  -- Signed-in site administrators are never included in public analytics.
  if auth.uid() is not null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_visitor_id::text,0));
  if (select count(*) from analytics_private.page_views where visitor_id=p_visitor_id and viewed_at > now()-interval '1 minute') >= 120 then return; end if;
  insert into analytics_private.page_views(event_id,visitor_id,page)
  values(p_event_id,p_visitor_id,p_page) on conflict(event_id) do nothing;
end;
$$;
revoke all on function analytics_private.record_view(uuid,uuid,text) from public;
grant execute on function analytics_private.record_view(uuid,uuid,text) to anon,authenticated;

create function public.analytics_record_view(p_event_id uuid,p_visitor_id uuid,p_page text)
returns void language sql security invoker set search_path = '' as $$
  select analytics_private.record_view(p_event_id,p_visitor_id,p_page);
$$;
revoke all on function public.analytics_record_view(uuid,uuid,text) from public;
grant execute on function public.analytics_record_view(uuid,uuid,text) to anon,authenticated;

create function analytics_private.monthly_report(p_month date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  start_time timestamptz;
  end_time timestamptz;
  result jsonb;
begin
  if auth.uid() is null or not exists(select 1 from analytics_private.readers where user_id=auth.uid()) then
    raise exception 'Analytics access denied' using errcode='42501';
  end if;
  if p_month is null or p_month <> date_trunc('month',p_month)::date or p_month < date '2020-01-01'
     or p_month > date_trunc('month',now() at time zone 'Asia/Bangkok')::date then
    raise exception 'Invalid analytics month' using errcode='22023';
  end if;
  start_time := p_month::timestamp at time zone 'Asia/Bangkok';
  end_time := (p_month + interval '1 month')::timestamp at time zone 'Asia/Bangkok';
  with selected as materialized (
    select visitor_id,page,extract(day from viewed_at at time zone 'Asia/Bangkok')::int as day
    from analytics_private.page_views where viewed_at >= start_time and viewed_at < end_time
  ), totals as (
    select count(*) as views,count(distinct visitor_id) as visitors from selected
  ), by_page as (
    select page,count(*) as views,count(distinct visitor_id) as visitors from selected group by page
  ), by_day as (
    select day,count(distinct visitor_id) as visitors from selected group by day
  )
  select jsonb_build_object(
    'visitors',totals.visitors,'views',totals.views,
    'startedAt',(select started_at from analytics_private.settings where id),
    'pages',coalesce((select jsonb_agg(to_jsonb(by_page) order by visitors desc,page) from by_page),'[]'::jsonb),
    'daily',coalesce((select jsonb_agg(to_jsonb(by_day) order by day) from by_day),'[]'::jsonb)
  ) into result from totals;
  return result;
end;
$$;
revoke all on function analytics_private.monthly_report(date) from public,anon;
grant execute on function analytics_private.monthly_report(date) to authenticated;

create function public.analytics_monthly_report(p_month date)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select analytics_private.monthly_report(p_month);
$$;
revoke all on function public.analytics_monthly_report(date) from public,anon;
grant execute on function public.analytics_monthly_report(date) to authenticated;

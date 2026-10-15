begin;
-- All fixtures are rolled back, including events, reader access and timestamps.
select set_config('analytics.test_event',gen_random_uuid()::text,true),
       set_config('analytics.test_visitor',gen_random_uuid()::text,true),
       set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
select public.analytics_record_view(current_setting('analytics.test_event')::uuid,current_setting('analytics.test_visitor')::uuid,'home');
reset role;
do $$begin
  if not exists(select 1 from analytics_private.page_views where event_id=current_setting('analytics.test_event')::uuid) then
    raise exception 'Unauthenticated visitor was not recorded';
  end if;
end;$$;
do $$
declare v1 uuid:=gen_random_uuid();v2 uuid:=gen_random_uuid();e uuid:=gen_random_uuid();r jsonb;before_count bigint;admin_id uuid;
begin
  select user_id into admin_id from analytics_private.readers limit 1;
  if admin_id is null then raise exception 'No analytics administrator configured'; end if;
  select count(*) into before_count from analytics_private.page_views;
  perform set_config('request.jwt.claims','{"role":"anon"}',true);
  perform public.analytics_record_view(e,v1,'home');
  perform public.analytics_record_view(e,v1,'home');
  if (select count(*) from analytics_private.page_views) <> before_count+1 then raise exception 'Duplicate event counted'; end if;
  begin
    perform public.analytics_record_view(gen_random_uuid(),v1,'admin');
    raise exception 'Admin page accepted';
  exception when invalid_parameter_value then null; end;
  update analytics_private.page_views set viewed_at='2020-01-31 17:00:00+00' where event_id=e;
  insert into analytics_private.page_views values
    (gen_random_uuid(),v1,'schedule','2020-02-01 01:00:00+00'),
    (gen_random_uuid(),v2,'schedule','2020-02-02 01:00:00+00'),
    (gen_random_uuid(),v2,'home','2020-01-31 16:59:59+00'),
    (gen_random_uuid(),v2,'home','2020-02-29 17:00:00+00');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  r:=public.analytics_monthly_report('2020-02-01');
  if (r->>'visitors')::int<>2 or (r->>'views')::int<>3 then raise exception 'Monthly totals/boundaries wrong: %',r;end if;
  if not r->'daily' @> '[{"day":1,"visitors":1},{"day":2,"visitors":1}]'::jsonb then raise exception 'Daily unique count wrong';end if;
  if not r->'pages' @> '[{"page":"schedule","visitors":2,"views":2}]'::jsonb then raise exception 'Menu unique count wrong';end if;
  r:=public.analytics_monthly_report('2020-04-01');
  if (r->>'views')::int<>0 or r->'pages'<>'[]'::jsonb then raise exception 'Empty month wrong';end if;
  select count(*) into before_count from analytics_private.page_views;
  perform public.analytics_record_view(gen_random_uuid(),v1,'home');
  if (select count(*) from analytics_private.page_views)<>before_count then raise exception 'Admin visit counted';end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
  begin
    perform public.analytics_monthly_report('2020-02-01');raise exception 'Non-admin read succeeded';
  exception when insufficient_privilege then null;end;
end;
$$;
set local role anon;
do $$begin
  begin perform * from analytics_private.page_views;raise exception 'Anonymous raw read succeeded';exception when insufficient_privilege then null;end;
  begin perform public.analytics_monthly_report('2020-02-01');raise exception 'Anonymous report succeeded';exception when insufficient_privilege then null;end;
end;$$;
reset role;
select 'Analytics database tests passed' as result;
rollback;

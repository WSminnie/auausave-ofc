-- Run against the migrated database. Everything is rolled back, including fixtures.
begin;
insert into public.series_archives(id,title_en,slug,visible) values
('__series_test_public','Test public','test-public',true),
('__series_test_hidden','Test hidden','test-hidden',false);
insert into public.series_episodes(id,series_id,episode_number,visible) values
('__series_test_ep','__series_test_public',1,true),
('__series_test_ep_hidden','__series_test_public',2,false),
('__series_test_parent_hidden','__series_test_hidden',1,true);
insert into public.series_episode_links(id,episode_id,label,url) values
('__series_test_link','__series_test_ep','Watch','https://example.com'),
('__series_test_hidden_link','__series_test_ep_hidden','Hidden','https://example.com'),
('__series_test_parent_link','__series_test_parent_hidden','Hidden parent','https://example.com');
insert into public.series_cast(id,series_id,artist_name) values
('__series_test_cast','__series_test_public','Test artist'),
('__series_test_cast_hidden','__series_test_hidden','Hidden artist');
insert into public.series_links(id,series_id,label,url) values
('__series_test_official','__series_test_public','Official','https://example.com'),
('__series_test_official_hidden','__series_test_hidden','Official','https://example.com');
insert into public.series_appearances(id,series_id,title,visible) values
('__series_test_appearance','__series_test_public','Test',true),
('__series_test_appearance_hidden','__series_test_hidden','Hidden',true);
insert into public.series_media(id,series_id,title,visible) values
('__series_test_media','__series_test_public','Test',true),
('__series_test_media_hidden','__series_test_public','Hidden',false);
insert into public.series_moments(id,series_id,title,visible) values
('__series_test_moment','__series_test_public','Test',true),
('__series_test_moment_hidden','__series_test_hidden','Hidden',true);
set local role anon;
do $$ declare t text; n integer; begin
  foreach t in array array['series_archives','series_episodes','series_episode_links','series_cast','series_links','series_appearances','series_media','series_moments'] loop
    execute format('select count(*) from public.%I where id like ''__series_test_%%''',t) into n;
    if n <> 1 then raise exception 'Publication filtering failed on %: % rows', t,n; end if;
  end loop;
  begin
    insert into public.series_archives(id,title_en,slug) values('__series_test_anon','Invalid','invalid');
    raise exception 'Anonymous write allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select public.save_series_archive(
  '{"id":"__series_test_public","title_en":"Updated","slug":"test-public","status":"ON AIR","visible":true}',
  '[{"artist_name":"Actor A","character_name":"Character A","display_order":1},{"artist_name":"Actor B","display_order":0}]',
  '[{"label":"Official","url":"https://example.com","display_order":0},{"label":"Watch","url":"https://example.com/watch","display_order":1}]');
select public.save_series_episode(
  '{"id":"__series_test_ep","series_id":"__series_test_public","episode_number":1,"status":"AVAILABLE","visible":true}',
  '[{"label":"Watch","url":"https://example.com","type":"WATCH","display_order":0},{"label":"Teaser","url":"https://example.com/teaser","type":"TEASER","display_order":1}]');
do $$ begin
  if (select count(*) from public.series_archives where id like '__series_test_%') <> 2 then raise exception 'Editor cannot read drafts'; end if;
  if (select count(*) from public.series_cast where series_id='__series_test_public') <> 2 then raise exception 'Cast save failed'; end if;
  if (select count(*) from public.series_episode_links where episode_id='__series_test_ep') <> 2 then raise exception 'Multiple links failed'; end if;
  begin
    perform public.save_series_episode('{"id":"__series_test_ep","series_id":"__series_test_public","episode_number":99,"status":"AVAILABLE","visible":true}', '[{"label":"Unsafe","url":"javascript:alert(1)","type":"WATCH","display_order":0}]');
    raise exception 'Unsafe URL accepted';
  exception when check_violation then null; end;
  if (select episode_number from public.series_episodes where id='__series_test_ep') <> 1 then raise exception 'Atomic save rollback failed'; end if;
  if (select count(*) from public.series_episode_links where episode_id='__series_test_ep') <> 2 then raise exception 'Existing links lost on failed save'; end if;
  begin
    insert into public.series_episodes(id,series_id,episode_number) values('__series_test_duplicate','__series_test_public',1);
    raise exception 'Duplicate episode accepted';
  exception when unique_violation then null; end;
  update public.series_appearances set title='Edited' where id='__series_test_appearance';
  update public.series_media set visible=false where id='__series_test_media';
  update public.series_moments set display_order=1 where id='__series_test_moment';
end $$;
-- Anonymous auth accounts must not inherit editor rights.
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}',true);
do $$ begin
  if exists(select 1 from public.series_archives where id='__series_test_hidden') then raise exception 'Anonymous auth reads drafts'; end if;
  begin
    insert into public.series_archives(id,title_en,slug) values('__series_test_anonauth','Invalid','invalid');
    raise exception 'Anonymous auth writes allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
delete from public.series_archives where id like '__series_test_%';
do $$ begin
  if exists(select 1 from public.series_episodes where id like '__series_test_%') then raise exception 'Episode cascade failed'; end if;
  if exists(select 1 from public.series_episode_links where episode_id like '__series_test_%') then raise exception 'Link cascade failed'; end if;
  if exists(select 1 from public.series_cast where series_id like '__series_test_%') then raise exception 'Cast cascade failed'; end if;
end $$;
rollback;
select 'PASS: publication, editor CRUD, anonymous write rejection, multi-link saves, rollback, duplicate constraints and cascades' as result;

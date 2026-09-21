begin;
insert into public.series(id,name) values('__qa_master_link','QA temporary master');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":false}',true);
select public.save_series_archive('{"id":"__qa_archive_link","master_series_id":"__qa_master_link","title_en":"Independent archive title","slug":"qa-archive-link","status":"UPCOMING","visible":false}', '[]','[]');
do $$ begin
  if (select master_series_id from public.series_archives where id='__qa_archive_link') <> '__qa_master_link' then raise exception 'Link not saved'; end if;
  if (select name from public.series where id='__qa_master_link') <> 'QA temporary master' then raise exception 'Master overwritten'; end if;
end $$;
delete from public.series where id='__qa_master_link';
do $$ begin
  if not exists(select 1 from public.series_archives where id='__qa_archive_link' and master_series_id is null and title_en='Independent archive title') then raise exception 'Archive not preserved after Master removal'; end if;
end $$;
rollback;
select 'PASS: Master link saved, Master not overwritten, archive preserved on Master removal' as result;

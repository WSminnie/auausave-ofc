-- Optional link to existing schedule taxonomy; archive fields remain independent snapshots.
alter table public.series_archives add column master_series_id text references public.series(id) on delete set null;
create index series_archives_master_series_idx on public.series_archives(master_series_id);

create or replace function public.save_series_archive(p_record jsonb, p_cast jsonb, p_links jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare v public.series_archives; row jsonb; begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  v := jsonb_populate_record(null::public.series_archives, p_record);
  insert into public.series_archives(id,master_series_id,title_en,title_th,slug,cover_url,banner_url,description,premiere_date,status,official_hashtag,broadcast_info,streaming_info,display_order,visible)
  values(v.id,v.master_series_id,v.title_en,v.title_th,v.slug,v.cover_url,v.banner_url,v.description,v.premiere_date,v.status,v.official_hashtag,v.broadcast_info,v.streaming_info,v.display_order,v.visible)
  on conflict(id) do update set master_series_id=excluded.master_series_id,title_en=excluded.title_en,title_th=excluded.title_th,slug=excluded.slug,cover_url=excluded.cover_url,banner_url=excluded.banner_url,description=excluded.description,premiere_date=excluded.premiere_date,status=excluded.status,official_hashtag=excluded.official_hashtag,broadcast_info=excluded.broadcast_info,streaming_info=excluded.streaming_info,display_order=excluded.display_order,visible=excluded.visible;
  delete from public.series_cast where series_id=v.id;
  for row in select value from jsonb_array_elements(p_cast) loop
    insert into public.series_cast(id,series_id,artist_name,character_name,image_url,description,display_order)
    values(gen_random_uuid()::text,v.id,row->>'artist_name',row->>'character_name',row->>'image_url',row->>'description',(row->>'display_order')::integer);
  end loop;
  delete from public.series_links where series_id=v.id;
  for row in select value from jsonb_array_elements(p_links) loop
    insert into public.series_links(id,series_id,label,url,display_order)
    values(gen_random_uuid()::text,v.id,row->>'label',row->>'url',(row->>'display_order')::integer);
  end loop;
  return v.id;
end $$;

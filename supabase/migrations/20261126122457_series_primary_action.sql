-- Optional overrides for the main Series watch button. Null keeps automatic episode-based behavior.
alter table public.series_archives
  add column primary_button_text text,
  add column primary_button_url text constraint series_primary_button_url_check
    check (primary_button_url ~* '^https?://[^[:space:]]+$');

create or replace function public.save_series_archive(p_record jsonb, p_cast jsonb, p_links jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  v public.series_archives;
  row jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  v := jsonb_populate_record(null::public.series_archives, p_record);
  insert into public.series_archives (
    id,master_series_id,title_en,title_th,slug,cover_url,banner_url,description,
    premiere_date,status,official_hashtag,broadcast_info,streaming_info,
    display_order,visible,theme_bg,theme_accent,show_broadcast_info,show_streaming_info,primary_button_text,primary_button_url
  ) values (
    v.id,v.master_series_id,v.title_en,v.title_th,v.slug,v.cover_url,v.banner_url,v.description,
    v.premiere_date,v.status,v.official_hashtag,v.broadcast_info,v.streaming_info,
    v.display_order,v.visible,v.theme_bg,v.theme_accent,coalesce(v.show_broadcast_info,true),coalesce(v.show_streaming_info,true),v.primary_button_text,v.primary_button_url
  )
  on conflict(id) do update set
    master_series_id=excluded.master_series_id,title_en=excluded.title_en,title_th=excluded.title_th,
    slug=excluded.slug,cover_url=excluded.cover_url,banner_url=excluded.banner_url,
    description=excluded.description,premiere_date=excluded.premiere_date,status=excluded.status,
    official_hashtag=excluded.official_hashtag,broadcast_info=excluded.broadcast_info,
    streaming_info=excluded.streaming_info,display_order=excluded.display_order,visible=excluded.visible,
    -- A save from an older frontend must not clear the configured palette.
    theme_bg=case when p_record ? 'theme_bg' then excluded.theme_bg else series_archives.theme_bg end,
    theme_accent=case when p_record ? 'theme_accent' then excluded.theme_accent else series_archives.theme_accent end,
    show_broadcast_info=case when p_record ? 'show_broadcast_info' then excluded.show_broadcast_info else series_archives.show_broadcast_info end,
    show_streaming_info=case when p_record ? 'show_streaming_info' then excluded.show_streaming_info else series_archives.show_streaming_info end,
    primary_button_text=case when p_record ? 'primary_button_text' then excluded.primary_button_text else series_archives.primary_button_text end,
    primary_button_url=case when p_record ? 'primary_button_url' then excluded.primary_button_url else series_archives.primary_button_url end;
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

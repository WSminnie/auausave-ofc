-- The legacy public.series table is schedule taxonomy. Keep it unchanged.
create table public.series_archives (
  id text primary key, title_en text not null check (length(trim(title_en)) > 0), title_th text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  cover_url text, banner_url text, description text, premiere_date date,
  status text not null default 'UPCOMING' check (status in ('UPCOMING','ON AIR','COMPLETED')),
  official_hashtag text, broadcast_info text, streaming_info text,
  display_order integer, visible boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.series_cast (
  id text primary key, series_id text not null references public.series_archives(id) on delete cascade,
  artist_name text not null check (length(trim(artist_name)) > 0), character_name text, image_url text, description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.series_links (
  id text primary key, series_id text not null references public.series_archives(id) on delete cascade,
  label text not null check (length(trim(label)) > 0), url text not null check (url ~* '^https?://[^[:space:]]+$'),
  display_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.series_episodes (
  id text primary key, series_id text not null references public.series_archives(id) on delete cascade,
  episode_number integer not null check (episode_number > 0), title text, air_date date, thumbnail_url text,
  description text, hashtag text, keyword text,
  status text not null default 'UPCOMING' check (status in ('UPCOMING','AVAILABLE')),
  display_order integer, visible boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(series_id, episode_number)
);
create table public.series_episode_links (
  id text primary key, episode_id text not null references public.series_episodes(id) on delete cascade,
  label text not null check (length(trim(label)) > 0), url text not null check (url ~* '^https?://[^[:space:]]+$'),
  type text not null default 'WATCH' check (type in ('WATCH','OFFICIAL POST','TRAILER','TEASER','OTHER')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.series_appearances (
  id text primary key, series_id text not null references public.series_archives(id) on delete cascade,
  date date, title text not null check (length(trim(title)) > 0),
  type text not null default 'OTHER' check (type in ('INTERVIEW','TV','RADIO','LIVE','PRESS','EVENT','OTHER')),
  participants text, thumbnail_url text, description text,
  official_url text check (official_url is null or official_url ~* '^https?://[^[:space:]]+$'),
  display_order integer, visible boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.series_media (
  id text primary key, series_id text not null references public.series_archives(id) on delete cascade,
  type text not null default 'OTHER' check (type in ('TRAILER','TEASER','OST','MV','BTS','SPECIAL','POSTER','OTHER')),
  title text not null check (length(trim(title)) > 0), date date, thumbnail_url text, description text,
  official_url text check (official_url is null or official_url ~* '^https?://[^[:space:]]+$'),
  display_order integer, visible boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.series_moments (
  id text primary key, series_id text not null references public.series_archives(id) on delete cascade,
  date date, title text not null check (length(trim(title)) > 0), description text, image_url text,
  related_url text check (related_url is null or related_url ~* '^https?://[^[:space:]]+$'),
  display_order integer, visible boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create function public.series_set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

-- Match the existing back office: provisioned, signed-in users are editors.
-- Anonymous sign-ins are excluded. No user-editable metadata is trusted.
do $$ declare t text; predicate text; begin
  foreach t in array array['series_archives','series_cast','series_links','series_episodes','series_episode_links','series_appearances','series_media','series_moments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy "Archive editors" on public.%I for all to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt())->>''is_anonymous'',''false'') = ''false'') with check ((select auth.uid()) is not null and coalesce((select auth.jwt())->>''is_anonymous'',''false'') = ''false'')',t);
    if t = 'series_archives' then
      predicate := 'visible';
    elsif t = 'series_episode_links' then
      predicate := 'exists (select 1 from public.series_episodes e join public.series_archives s on s.id=e.series_id where e.id=episode_id and e.visible and s.visible)';
    else
      predicate := 'exists (select 1 from public.series_archives s where s.id=series_id and s.visible)';
      if t not in ('series_cast','series_links') then predicate := 'visible and ' || predicate; end if;
    end if;
    execute format('create policy "Published archive" on public.%I for select to anon, authenticated using (%s)', t, predicate);
    execute format('create trigger series_updated_at before update on public.%I for each row execute function public.series_set_updated_at()', t);
    if t <> 'series_archives' then
      execute format('create index on public.%I (%I, display_order)', t, case when t='series_episode_links' then 'episode_id' else 'series_id' end);
    end if;
  end loop;
end $$;
create index series_archives_public_order on public.series_archives(visible, display_order);

-- Atomic parent and repeatable-row saves; JSON is transport only, not storage.
create function public.save_series_archive(p_record jsonb, p_cast jsonb, p_links jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare v public.series_archives; row jsonb; begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  v := jsonb_populate_record(null::public.series_archives, p_record);
  insert into public.series_archives(id,title_en,title_th,slug,cover_url,banner_url,description,premiere_date,status,official_hashtag,broadcast_info,streaming_info,display_order,visible)
  values(v.id,v.title_en,v.title_th,v.slug,v.cover_url,v.banner_url,v.description,v.premiere_date,v.status,v.official_hashtag,v.broadcast_info,v.streaming_info,v.display_order,v.visible)
  on conflict(id) do update set title_en=excluded.title_en,title_th=excluded.title_th,slug=excluded.slug,cover_url=excluded.cover_url,banner_url=excluded.banner_url,description=excluded.description,premiere_date=excluded.premiere_date,status=excluded.status,official_hashtag=excluded.official_hashtag,broadcast_info=excluded.broadcast_info,streaming_info=excluded.streaming_info,display_order=excluded.display_order,visible=excluded.visible;
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
create function public.save_series_episode(p_record jsonb, p_links jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare v public.series_episodes; row jsonb; begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  v := jsonb_populate_record(null::public.series_episodes, p_record);
  insert into public.series_episodes(id,series_id,episode_number,title,air_date,thumbnail_url,description,hashtag,keyword,status,display_order,visible)
  values(v.id,v.series_id,v.episode_number,v.title,v.air_date,v.thumbnail_url,v.description,v.hashtag,v.keyword,v.status,v.display_order,v.visible)
  on conflict(id) do update set series_id=excluded.series_id,episode_number=excluded.episode_number,title=excluded.title,air_date=excluded.air_date,thumbnail_url=excluded.thumbnail_url,description=excluded.description,hashtag=excluded.hashtag,keyword=excluded.keyword,status=excluded.status,display_order=excluded.display_order,visible=excluded.visible;
  delete from public.series_episode_links where episode_id=v.id;
  for row in select value from jsonb_array_elements(p_links) loop
    insert into public.series_episode_links(id,episode_id,label,url,type,display_order)
    values(gen_random_uuid()::text,v.id,row->>'label',row->>'url',row->>'type',(row->>'display_order')::integer);
  end loop;
  return v.id;
end $$;
revoke all on function public.save_series_archive(jsonb,jsonb,jsonb) from public, anon;
revoke all on function public.save_series_episode(jsonb,jsonb) from public, anon;
grant execute on function public.save_series_archive(jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.save_series_episode(jsonb,jsonb) to authenticated;

-- AUAUSAVE HOUSE — Supabase schema
-- Run this entire file once in Supabase Dashboard > SQL Editor.

-- Supabase SQL Editor should run migrations with the database owner role.
set role postgres;

create table if not exists public.artists (
  id text primary key, nickname text not null, "name_TH" text, "name_EN" text, role text,
  birth text, initial text, color text, bio text, image_url text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

create table if not exists public.event_types (
  id text primary key, name text not null unique, sort_order integer default 0
);

create table if not exists public.series (
  id text primary key, name text not null unique, description text
);

create table if not exists public.events (
  id text primary key, artist_id text references public.artists(id) on delete cascade,
  event_date date not null, title text not null, place text, event_type text not null,
  series_id text references public.series(id) on delete set null,
  source_url text, poster_url text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create index if not exists events_date_idx on public.events(event_date);
create index if not exists events_artist_idx on public.events(artist_id);

create table if not exists public.awards (
  id text primary key, artist_id text references public.artists(id) on delete cascade,
  award_year integer, title text not null, organization text, source_url text,
  created_at timestamptz default now()
);

create table if not exists public.presenters (
  id text primary key, artist_id text references public.artists(id) on delete cascade,
  brand text not null, role text, presenter_year integer, color text, source_url text,
  logo_url text, announcement_image_url text, announcement_video_url text,
  media_fit text default 'contain' check (media_fit in ('contain','cover')),
  media_position text default 'center' check (media_position in ('top','center','bottom')),
  created_at timestamptz default now()
);

create table if not exists public.videos (
  id text primary key, artist_id text references public.artists(id) on delete cascade,
  title text not null, views_label text, youtube_url text not null, embed_url text,
  category text default 'variety' check (category in ('auau','dexx','variety')),
  featured boolean default false, color text, thumbnail_url text,
  created_at timestamptz default now()
);

create table if not exists public.site_settings (
  id text primary key, settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

insert into public.event_types(id,name,sort_order) values
 ('event','Event',1),('live','Live',2),('series','Series',3),('private','Private',4),('other','Other',5),('dexx','DEXX',6)
on conflict (id) do update set name=excluded.name,sort_order=excluded.sort_order;
insert into public.series(id,name) values ('yoursky','YourSkySeries'),('fanboy','Mr.Fanboy Series')
on conflict (id) do update set name=excluded.name;

-- Public visitors can read. Only signed-in admins can change data.
alter table public.artists enable row level security;
alter table public.event_types enable row level security;
alter table public.series enable row level security;
alter table public.events enable row level security;
alter table public.awards enable row level security;
alter table public.presenters enable row level security;
alter table public.videos enable row level security;
alter table public.site_settings enable row level security;

do $$ declare t text; begin
  foreach t in array array['artists','event_types','series','events','awards','presenters','videos','site_settings'] loop
    execute format('drop policy if exists "Public read" on public.%I',t);
    execute format('create policy "Public read" on public.%I for select using (true)',t);
    execute format('drop policy if exists "Authenticated insert" on public.%I',t);
    execute format('create policy "Authenticated insert" on public.%I for insert to authenticated with check (true)',t);
    execute format('drop policy if exists "Authenticated update" on public.%I',t);
    execute format('create policy "Authenticated update" on public.%I for update to authenticated using (true) with check (true)',t);
    execute format('drop policy if exists "Authenticated delete" on public.%I',t);
    execute format('create policy "Authenticated delete" on public.%I for delete to authenticated using (true)',t);
  end loop;
end $$;

insert into public.site_settings(id,settings) values
('homepage','{"heroImage":"","heroFit":"cover","heroPosition":"center"}'::jsonb)
on conflict (id) do nothing;

-- Public media bucket. Reads are public; writes require a signed-in admin.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('media','media',true,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public=true,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Public media read" on storage.objects;
create policy "Public media read" on storage.objects for select using (bucket_id='media');
drop policy if exists "Admin media insert" on storage.objects;
create policy "Admin media insert" on storage.objects for insert to authenticated with check (bucket_id='media');
drop policy if exists "Admin media update" on storage.objects;
create policy "Admin media update" on storage.objects for update to authenticated using (bucket_id='media');
drop policy if exists "Admin media delete" on storage.objects;
create policy "Admin media delete" on storage.objects for delete to authenticated using (bucket_id='media');

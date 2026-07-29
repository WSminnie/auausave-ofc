-- AUAUSAVE HOUSE — Supabase schema
-- Run this entire file once in Supabase Dashboard > SQL Editor.

-- Supabase SQL Editor should run migrations with the database owner role.
set role postgres;

create table if not exists public.artists (
  id text primary key, nickname text not null, "name_TH" text, "name_EN" text, role text,
  birth text, initial text, color text, bio text, image_url text,
  social_links jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now()
);

-- Safe migration for databases created before Artist Official Socials existed.
alter table public.artists add column if not exists social_links jsonb not null default '[]'::jsonb;

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

create table if not exists public.award_sections (
  id text primary key,
  name text not null,
  slug text not null unique,
  parent_id text references public.award_sections(id) on delete restrict,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (parent_id is null or parent_id <> id)
);

alter table public.awards add column if not exists main_section_id text references public.award_sections(id) on delete set null;
alter table public.awards add column if not exists subsection_id text references public.award_sections(id) on delete set null;
alter table public.awards add column if not exists award_day integer check (award_day between 1 and 31);
alter table public.awards add column if not exists award_month integer check (award_month between 1 and 12);
alter table public.awards add column if not exists display_order integer not null default 0;
alter table public.awards add column if not exists image_url text;

insert into public.award_sections(id,name,slug,parent_id,display_order,active) values
 ('award-section-auausave','AUAUSAVE','auausave',null,1,true),
 ('award-section-auau','AUAU','auau',null,2,true),
 ('award-section-save','SAVE','save',null,3,true)
on conflict (id) do nothing;

create table if not exists public.award_section_assignments (
  id text primary key,
  award_id text not null references public.awards(id) on delete cascade,
  main_section_id text not null references public.award_sections(id) on delete cascade,
  subsection_id text references public.award_sections(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz default now(),
  unique (award_id, main_section_id, subsection_id)
);

insert into public.award_sections(id,name,slug,parent_id,display_order,active) values
 ('award-section-solo-artist','SOLO ARTIST','solo-artist','award-section-auau',1,true),
 ('award-section-dexx','DEXX','dexx','award-section-auau',2,true)
on conflict (id) do nothing;

create table if not exists public.award_data_migrations (
  migration_key text primary key,
  applied_at timestamptz not null default now()
);

-- Run legacy placement only once. Re-running this schema must never restore an
-- assignment that an admin intentionally removed later.
do $$
begin
  if not exists (
    select 1 from public.award_data_migrations
    where migration_key = 'award-section-assignments-v1'
  ) then
    update public.awards set main_section_id = case
      when artist_id in ('AT01','duo') then 'award-section-auausave'
      when artist_id in ('AT02','auau') then 'award-section-auau'
      when artist_id in ('AT03','save') then 'award-section-save'
      else main_section_id end
    where main_section_id is null;

    insert into public.award_section_assignments(id,award_id,main_section_id,subsection_id,display_order)
    select concat('asa-',md5(concat_ws('|',id,main_section_id,coalesce(subsection_id,'')))),
           id,main_section_id,subsection_id,display_order
    from public.awards
    where main_section_id is not null
    on conflict do nothing;

    insert into public.award_data_migrations(migration_key)
    values ('award-section-assignments-v1');
  end if;
end $$;

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
alter table public.award_sections enable row level security;
alter table public.award_section_assignments enable row level security;
alter table public.presenters enable row level security;
alter table public.videos enable row level security;
alter table public.site_settings enable row level security;

do $$ declare t text; begin
  foreach t in array array['artists','event_types','series','events','awards','award_sections','award_section_assignments','presenters','videos','site_settings'] loop
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

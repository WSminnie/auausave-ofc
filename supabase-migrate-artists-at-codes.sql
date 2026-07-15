-- AUAUSAVE HOUSE — migrate artists table to ATxx ids and new name columns.
-- Run in Supabase Dashboard > SQL Editor with the database owner role.

begin;

-- Rename columns requested by the project.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'artists' and column_name = 'name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'artists' and column_name = 'nickname'
  ) then
    alter table public.artists rename column name to nickname;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'artists' and column_name = 'real_name'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'artists' and column_name = 'name_TH'
  ) then
    alter table public.artists rename column real_name to "name_TH";
  end if;
end $$;

alter table public.artists add column if not exists "name_EN" text;

-- Copy the old artist rows into their new ids first, so foreign keys remain safe.
insert into public.artists (id, nickname, "name_TH", "name_EN", role, birth, initial, color, bio, image_url)
select 'AT01', nickname, "name_TH", coalesce("name_EN", nickname), role, birth, initial, color, bio, image_url
from public.artists
where id = 'duo'
on conflict (id) do update set
  nickname = excluded.nickname,
  "name_TH" = excluded."name_TH",
  "name_EN" = coalesce(public.artists."name_EN", excluded."name_EN"),
  role = excluded.role,
  birth = excluded.birth,
  initial = excluded.initial,
  color = excluded.color,
  bio = excluded.bio,
  image_url = excluded.image_url,
  updated_at = now();

insert into public.artists (id, nickname, "name_TH", "name_EN", role, birth, initial, color, bio, image_url)
select 'AT02', nickname, "name_TH", coalesce("name_EN", nickname), role, birth, initial, color, bio, image_url
from public.artists
where id = 'auau'
on conflict (id) do update set
  nickname = excluded.nickname,
  "name_TH" = excluded."name_TH",
  "name_EN" = coalesce(public.artists."name_EN", excluded."name_EN"),
  role = excluded.role,
  birth = excluded.birth,
  initial = excluded.initial,
  color = excluded.color,
  bio = excluded.bio,
  image_url = excluded.image_url,
  updated_at = now();

insert into public.artists (id, nickname, "name_TH", "name_EN", role, birth, initial, color, bio, image_url)
select 'AT03', nickname, "name_TH", coalesce("name_EN", nickname), role, birth, initial, color, bio, image_url
from public.artists
where id = 'save'
on conflict (id) do update set
  nickname = excluded.nickname,
  "name_TH" = excluded."name_TH",
  "name_EN" = coalesce(public.artists."name_EN", excluded."name_EN"),
  role = excluded.role,
  birth = excluded.birth,
  initial = excluded.initial,
  color = excluded.color,
  bio = excluded.bio,
  image_url = excluded.image_url,
  updated_at = now();

insert into public.artists (id, nickname, "name_TH", "name_EN", role, birth, initial, color, bio, image_url)
select 'AT04', nickname, "name_TH", coalesce("name_EN", nickname), role, birth, initial, color, bio, image_url
from public.artists
where id in ('mp', 'a1783509325576')
order by case id when 'mp' then 1 else 2 end
limit 1
on conflict (id) do update set
  nickname = excluded.nickname,
  "name_TH" = excluded."name_TH",
  "name_EN" = coalesce(public.artists."name_EN", excluded."name_EN"),
  role = excluded.role,
  birth = excluded.birth,
  initial = excluded.initial,
  color = excluded.color,
  bio = excluded.bio,
  image_url = excluded.image_url,
  updated_at = now();

-- Update direct artist references.
update public.events set artist_id = case artist_id
  when 'duo' then 'AT01'
  when 'auau' then 'AT02'
  when 'save' then 'AT03'
  when 'mp' then 'AT04'
  when 'a1783509325576' then 'AT04'
  else artist_id
end
where artist_id in ('duo', 'auau', 'save', 'mp', 'a1783509325576');

update public.awards set artist_id = case artist_id
  when 'duo' then 'AT01'
  when 'auau' then 'AT02'
  when 'save' then 'AT03'
  when 'mp' then 'AT04'
  when 'a1783509325576' then 'AT04'
  else artist_id
end
where artist_id in ('duo', 'auau', 'save', 'mp', 'a1783509325576');

update public.presenters set artist_id = case artist_id
  when 'duo' then 'AT01'
  when 'auau' then 'AT02'
  when 'save' then 'AT03'
  when 'mp' then 'AT04'
  when 'a1783509325576' then 'AT04'
  else artist_id
end
where artist_id in ('duo', 'auau', 'save', 'mp', 'a1783509325576');

update public.videos set artist_id = case artist_id
  when 'duo' then 'AT01'
  when 'auau' then 'AT02'
  when 'save' then 'AT03'
  when 'mp' then 'AT04'
  when 'a1783509325576' then 'AT04'
  else artist_id
end
where artist_id in ('duo', 'auau', 'save', 'mp', 'a1783509325576');

-- Update JSON settings without replacing normal words; only quoted JSON ids/keys.
update public.site_settings
set settings = replace(
  replace(
  replace(
  replace(
  replace(settings::text,
    '"a1783509325576"', '"AT04"'),
    '"duo"', '"AT01"'),
    '"auau"', '"AT02"'),
    '"save"', '"AT03"'),
    '"mp"', '"AT04"')::jsonb
where settings::text ~ '"(a1783509325576|duo|auau|save|mp)"';

delete from public.artists
where id in ('duo', 'auau', 'save', 'mp', 'a1783509325576');

commit;


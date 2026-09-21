create function public.reorder_series_content(p_kind text, p_ids text[], p_series_id text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare target_table text; scope_sql text; actual_ids text[];
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Editor sign-in required';
  end if;
  target_table := case p_kind when 'series' then 'series_archives' when 'episodes' then 'series_episodes'
    when 'appearances' then 'series_appearances' when 'media' then 'series_media' when 'moments' then 'series_moments' end;
  if target_table is null then raise exception 'Invalid content type'; end if;
  if p_kind <> 'series' and p_series_id is null then raise exception 'Select a series first'; end if;
  if p_ids is null or cardinality(p_ids) = 0 or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id) then
    raise exception 'Invalid order';
  end if;
  perform pg_advisory_xact_lock(724916204);
  scope_sql := case when p_kind = 'series' then 'true' else 'series_id = $1' end;
  execute format('select array_agg(id order by id) from (select id from public.%I where %s for update) locked', target_table, scope_sql)
    into actual_ids using p_series_id;
  if actual_ids is distinct from (select array_agg(id order by id) from unnest(p_ids) id) then
    raise exception 'The list changed. Reload and try again.';
  end if;
  execute format('update public.%I t set display_order = (o.position - 1)::integer from unnest($1::text[]) with ordinality o(id, position) where t.id = o.id', target_table) using p_ids;
end $$;
revoke all on function public.reorder_series_content(text,text[],text) from public, anon;
grant execute on function public.reorder_series_content(text,text[],text) to authenticated;

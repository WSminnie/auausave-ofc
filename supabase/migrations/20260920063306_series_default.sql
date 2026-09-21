alter table public.series_archives add column is_default boolean not null default false;
create unique index series_one_default on public.series_archives(is_default) where is_default;

create function public.set_default_series(p_series_id text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false') <> 'false' then
    raise exception 'Editor sign-in required';
  end if;
  -- Serialize concurrent default changes; only published records may be chosen.
  perform pg_advisory_xact_lock(724916203);
  perform 1 from public.series_archives where id=p_series_id and visible for update;
  if not found then raise exception 'Publish this series before setting it as default'; end if;
  update public.series_archives set is_default=false where is_default and id<>p_series_id;
  update public.series_archives set is_default=true where id=p_series_id;
end $$;
revoke all on function public.set_default_series(text) from public, anon;
grant execute on function public.set_default_series(text) to authenticated;

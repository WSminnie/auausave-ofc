alter table public.events add column if not exists rescheduled_from text references public.events(id) on delete set null;
create unique index if not exists events_rescheduled_from_unique on public.events(rescheduled_from) where rescheduled_from is not null;
create or replace function public.validate_event_reschedule() returns trigger language plpgsql set search_path=public as $$
declare parent public.events;
begin
 if new.rescheduled_from is not null then
  select * into parent from public.events where id=new.rescheduled_from for update;
  if not found or parent.id=new.id or parent.event_status<>'postponed' or new.event_date<=parent.event_date then
   raise exception 'Ref requires a postponed event with an earlier date';
  end if;
 end if;
 if exists(select 1 from public.events where rescheduled_from=new.id and (new.event_status<>'postponed' or event_date<=new.event_date)) then
  raise exception 'Original event must remain postponed and earlier than its replacement';
 end if;
 return new;
end $$;
drop trigger if exists validate_event_reschedule on public.events;
create trigger validate_event_reschedule before insert or update on public.events for each row execute function public.validate_event_reschedule();

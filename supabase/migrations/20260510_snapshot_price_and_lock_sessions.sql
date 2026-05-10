-- 1) Snapshot per-person price for existing sessions
--    so future lesson mode price edits won't change past finance totals.
update public.sessions s
set price_cents = lm.default_price_cents
from public.lesson_modes lm
where s.lesson_mode_id = lm.id
  and s.price_cents is null;

-- 2) Lock session edits after 14 days (Asia/Singapore calendar date)
create or replace function public.coach_agent_is_session_locked(p_session_date date)
returns boolean
language sql
stable
as $$
  select p_session_date <= ((now() at time zone 'Asia/Singapore')::date - 14);
$$;

create or replace function public.coach_agent_block_old_session_mutation()
returns trigger
language plpgsql
as $$
begin
  if public.coach_agent_is_session_locked(old.session_date) then
    raise exception 'session_locked: sessions older than 14 days cannot be modified';
  end if;
  return old;
end;
$$;

drop trigger if exists coach_agent_lock_sessions_update on public.sessions;
create trigger coach_agent_lock_sessions_update
before update on public.sessions
for each row execute function public.coach_agent_block_old_session_mutation();

drop trigger if exists coach_agent_lock_sessions_delete on public.sessions;
create trigger coach_agent_lock_sessions_delete
before delete on public.sessions
for each row execute function public.coach_agent_block_old_session_mutation();

create or replace function public.coach_agent_block_old_session_students_mutation()
returns trigger
language plpgsql
as $$
declare
  d date;
begin
  select s.session_date into d
  from public.sessions s
  where s.id = coalesce(new.session_id, old.session_id);

  if d is not null and public.coach_agent_is_session_locked(d) then
    raise exception 'session_locked: attendance for sessions older than 14 days cannot be modified';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists coach_agent_lock_session_students_insert on public.session_students;
create trigger coach_agent_lock_session_students_insert
before insert on public.session_students
for each row execute function public.coach_agent_block_old_session_students_mutation();

drop trigger if exists coach_agent_lock_session_students_update on public.session_students;
create trigger coach_agent_lock_session_students_update
before update on public.session_students
for each row execute function public.coach_agent_block_old_session_students_mutation();

drop trigger if exists coach_agent_lock_session_students_delete on public.session_students;
create trigger coach_agent_lock_session_students_delete
before delete on public.session_students
for each row execute function public.coach_agent_block_old_session_students_mutation();


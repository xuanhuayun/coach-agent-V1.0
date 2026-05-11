-- Coach Agent (badminton) schema
-- Run this in Supabase SQL editor. It is designed for single-coach-per-project,
-- with per-user isolation via auth.uid() so you can share the project safely.

-- Enable uuid helpers
create extension if not exists "pgcrypto";

-- Venues (courts / places)
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Students
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  avatar_path text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Lesson modes (ratio + duration variants) with per-person session price
create table if not exists public.lesson_modes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null, -- e.g. "1:1-1h"
  label text not null, -- e.g. "1:1，1 小时"
  default_price_cents int not null check (default_price_cents >= 0),
  default_duration_hours numeric not null default 2 check (default_duration_hours > 0),
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

-- Sessions (a class/lesson instance)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null default (now() at time zone 'utc')::date,
  venue_id uuid references public.venues(id) on delete set null,
  lesson_mode_id uuid references public.lesson_modes(id) on delete set null,
  content text,         -- 今日课程内容
  improvements text,    -- 学员要改进点
  remarks text,         -- 备注
  next_booking_at timestamptz, -- 下次约课时间
  next_booking_duration_hours numeric not null default 2 check (next_booking_duration_hours > 0),
  price_cents int check (price_cents >= 0), -- snapshot override; if null, use mode default
  duration_hours numeric not null default 2 check (duration_hours > 0),
  created_at timestamptz not null default now()
);

-- Join: which students attended a session
create table if not exists public.session_students (
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  improvements text,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

-- Helpful indexes
create index if not exists sessions_user_date_idx on public.sessions(user_id, session_date desc);
create index if not exists students_user_created_idx on public.students(user_id, created_at desc);

-- Lock session edits after 14 days (Asia/Singapore calendar date)
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

-- Row Level Security
alter table public.venues enable row level security;
alter table public.students enable row level security;
alter table public.lesson_modes enable row level security;
alter table public.sessions enable row level security;
alter table public.session_students enable row level security;

-- Policies: each row belongs to auth.uid()
do $$
begin
  -- venues
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='venues' and policyname='venues_owner_all') then
    create policy venues_owner_all on public.venues
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  -- students
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='students' and policyname='students_owner_all') then
    create policy students_owner_all on public.students
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  -- lesson_modes
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='lesson_modes' and policyname='lesson_modes_owner_all') then
    create policy lesson_modes_owner_all on public.lesson_modes
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  -- sessions
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sessions' and policyname='sessions_owner_all') then
    create policy sessions_owner_all on public.sessions
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  -- session_students: enforce ownership through the session
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='session_students' and policyname='session_students_owner_all') then
    create policy session_students_owner_all on public.session_students
      for all
      using (
        exists (
          select 1 from public.sessions s
          where s.id = session_students.session_id
            and s.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.sessions s
          where s.id = session_students.session_id
            and s.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Seed defaults for a new user can be done from the app.

-- Backfill for databases created before lesson mode duration was added.
alter table public.lesson_modes
  add column if not exists default_duration_hours numeric not null default 2
  check (default_duration_hours > 0);

-- Backfill for databases created before per-student paid status was added.
alter table public.session_students
  add column if not exists paid boolean not null default false;

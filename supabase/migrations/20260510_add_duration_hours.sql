-- Run once in Supabase SQL editor if you already created tables from schema.sql
alter table public.sessions
  add column if not exists duration_hours numeric not null default 2
  check (duration_hours > 0);

alter table public.session_students
add column if not exists paid boolean not null default false;


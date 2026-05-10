alter table public.venues
add column if not exists sort_order int not null default 0;


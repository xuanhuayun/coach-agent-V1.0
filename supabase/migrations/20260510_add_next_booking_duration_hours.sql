alter table public.sessions
add column if not exists next_booking_duration_hours numeric not null default 2
check (next_booking_duration_hours > 0);


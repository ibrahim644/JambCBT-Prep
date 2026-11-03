create table if not exists public.scholarship_applications (
  id uuid primary key default gen_random_uuid(),
  surname text not null,
  firstname text not null,
  lastname text not null,
  nin_number text not null check (nin_number ~ '^[0-9]{11}$'),
  age integer not null check (age between 10 and 100),
  state text not null,
  school text not null,
  email text not null,
  status text not null default 'under_review'
    check (status in ('under_review', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.scholarship_applications enable row level security;

revoke all on table public.scholarship_applications from anon, authenticated;
grant insert on table public.scholarship_applications to service_role;

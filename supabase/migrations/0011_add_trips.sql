-- Trip / tab mode: bundle several bills under one event so they can be
-- settled together instead of bill-by-bill. Non-breaking for existing rows —
-- `trip_id` is nullable and untouched by the default (non-trip) bill flow.
create table trips (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  organizer_device_token text not null,
  currency text not null default 'PHP',
  status text not null default 'open' check (status in ('open', 'settled')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

alter table sessions add column trip_id uuid references trips(id) on delete set null;

alter table trips enable row level security;
create policy "trips are readable by anyone with the row" on trips for select using (true);

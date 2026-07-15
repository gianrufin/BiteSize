-- BiteSize MVP schema
-- Money is stored as integer cents throughout to avoid floating point rounding bugs.

create table sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'draft' check (status in ('draft', 'open', 'locked')),
  payer_device_token text not null,
  name text,
  venue_name text,
  receipt_image_url text,
  currency text not null default 'USD',
  subtotal_cents integer not null default 0,
  tax_cents integer not null default 0,
  service_charge_cents integer not null default 0,
  tip_cents integer not null default 0,
  discount_cents integer not null default 0,
  grand_total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  locked_at timestamptz
);

create table items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  name text not null,
  quantity numeric not null default 1,
  unit_price_cents integer not null,
  total_price_cents integer not null,
  is_shared boolean not null default false,
  ocr_confidence numeric,
  source text not null default 'manual' check (source in ('ocr', 'manual')),
  position integer not null default 0
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions (id) on delete cascade,
  name text not null,
  device_token text not null,
  is_payer boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (session_id, device_token)
);

create table item_claims (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items (id) on delete cascade,
  participant_id uuid not null references participants (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (item_id, participant_id)
);

create index items_session_id_idx on items (session_id);
create index participants_session_id_idx on participants (session_id);
create index item_claims_item_id_idx on item_claims (item_id);
create index item_claims_participant_id_idx on item_claims (participant_id);

alter table sessions enable row level security;
alter table items enable row level security;
alter table participants enable row level security;
alter table item_claims enable row level security;

-- MVP: sessions are anonymous capability links (unguessable `code`), not user-owned rows,
-- so anyone holding the session code can read/write its data. All writes go through the
-- Next.js API routes (service-role key), never directly from the browser, so these
-- permissive policies only need to cover the anon key's read access used for Realtime.
create policy "sessions are readable by anyone with the row" on sessions for select using (true);
create policy "items are readable by anyone with the session" on items for select using (true);
create policy "participants are readable by anyone with the session" on participants for select using (true);
create policy "item_claims are readable by anyone with the session" on item_claims for select using (true);

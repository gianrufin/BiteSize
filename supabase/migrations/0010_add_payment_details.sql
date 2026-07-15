-- Richer payment tracking per participant: how they paid, an optional
-- reference number and free-text note, how much of their share has actually
-- landed (for partial payments), and when each step happened.
alter table participants
  add column payment_method text not null default 'gcash'
    check (payment_method in ('gcash', 'cash', 'other')),
  add column payment_reference text,
  add column payment_note text,
  add column amount_paid_cents integer not null default 0,
  add column payment_submitted_at timestamptz,
  add column payment_confirmed_at timestamptz;

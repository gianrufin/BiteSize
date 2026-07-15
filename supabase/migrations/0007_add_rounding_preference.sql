-- Lets the payer round each participant's share to the nearest 1/5/10 (in the
-- bill's minor currency unit, e.g. nearest ₱1/₱5/₱10) instead of the exact
-- cent amount — handy for cash payments where exact change is impractical.
-- Stored as the rounding unit itself, in cents: 1 = off (exact), 100 = ₱1,
-- 500 = ₱5, 1000 = ₱10.
alter table sessions
  add column rounding_preference_cents integer not null default 1
    check (rounding_preference_cents in (1, 100, 500, 1000));

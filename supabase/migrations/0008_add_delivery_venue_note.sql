-- Delivery fee joins tax/service charge/tip as a fifth charge type, prorated
-- the same way. Venue location and a short bill note are purely descriptive,
-- device-editable metadata (no calculation impact).
alter table sessions
  add column delivery_fee_cents integer not null default 0,
  add column venue_location text,
  add column note text;

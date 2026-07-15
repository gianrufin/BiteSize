-- Payment status per participant (separate from item claiming — claiming an
-- item says what you owe, this tracks whether you've actually paid it), an
-- optional payment-proof screenshot, and the payer's own GCash QR code image
-- so participants can scan instead of typing the number.
alter table participants
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'submitted', 'confirmed'));
alter table participants
  add column payment_proof_url text;

alter table sessions
  add column gcash_qr_url text;

-- Public bucket: proof screenshots and QR images are only ever linked from an
-- unguessable session/join URL (the same capability-link model as the rest of
-- the app), and all writes go through the service-role key from API routes,
-- never directly from the browser — see the RLS comment in 0001_init.sql.
insert into storage.buckets (id, name, public)
values ('bitesize-uploads', 'bitesize-uploads', true)
on conflict (id) do nothing;

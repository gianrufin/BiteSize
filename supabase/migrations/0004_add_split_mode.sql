-- Lets the payer choose "split evenly by headcount" instead of item-by-item
-- claiming for bills where that's simpler (e.g. everyone had roughly the same
-- thing, or it's not worth the hassle of itemizing). Items/claims stay intact
-- either way — this only changes how the UI computes and displays shares.
alter table sessions
  add column split_mode text not null default 'items'
    check (split_mode in ('items', 'even'));

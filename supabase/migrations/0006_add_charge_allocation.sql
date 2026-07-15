-- Lets the payer choose how tax/service charge/tip/discount get divided among
-- participants: proportional to each person's item subtotal (the existing,
-- still-default behavior) or split evenly among everyone included. A
-- participant can also be excluded from these charges entirely (e.g. "don't
-- charge the kid the service fee") — their share isn't redistributed to other
-- participants, it's absorbed by the payer, same rounding philosophy as
-- reconcileRounding already uses.
alter table sessions
  add column charge_allocation_mode text not null default 'proportional'
    check (charge_allocation_mode in ('proportional', 'equal'));

alter table participants
  add column excluded_from_charges boolean not null default false;

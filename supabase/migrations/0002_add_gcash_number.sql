-- Lets the payer store their GCash number on the bill so participants can see
-- where to send payment without having to ask.
alter table sessions add column gcash_number text;

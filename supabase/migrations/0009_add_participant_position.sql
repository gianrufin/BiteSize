-- Explicit manual ordering for the participant list (separate from joined_at,
-- since the payer can now reorder people regardless of when they joined).
-- Backfilled by join order so the initial ordering matches what's already
-- shown today.
alter table participants add column position integer not null default 0;

update participants p
set position = ranked.rank
from (
  select id, row_number() over (partition by session_id order by joined_at) - 1 as rank
  from participants
) ranked
where p.id = ranked.id;

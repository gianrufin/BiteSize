-- Lets clients subscribe to live changes on these tables (items being added/edited,
-- claims being made, participants joining) so payer and participant screens update
-- without a manual refresh. RLS policies from 0001 already allow the anon role to
-- SELECT these rows, which is what Realtime needs to broadcast changes.
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table item_claims;
alter publication supabase_realtime add table participants;

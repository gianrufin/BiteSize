import { createServerSupabaseClient } from "@/lib/supabase/server";

// Subtotal/grand total are derived from items + charges rather than accumulated
// incrementally, so they're always exactly right regardless of which item changed.
export async function recomputeSessionTotals(sessionId: string) {
  const supabase = createServerSupabaseClient();

  const { data: items } = await supabase
    .from("items")
    .select("total_price_cents")
    .eq("session_id", sessionId);

  const subtotalCents = (items ?? []).reduce(
    (sum, item) => sum + item.total_price_cents,
    0,
  );

  const { data: session } = await supabase
    .from("sessions")
    .select("tax_cents, service_charge_cents, tip_cents, delivery_fee_cents, discount_cents")
    .eq("id", sessionId)
    .single();

  if (!session) throw new Error("Session not found");

  const grandTotalCents =
    subtotalCents +
    session.tax_cents +
    session.service_charge_cents +
    session.tip_cents +
    session.delivery_fee_cents -
    session.discount_cents;

  const { data: updated, error } = await supabase
    .from("sessions")
    .update({ subtotal_cents: subtotalCents, grand_total_cents: grandTotalCents })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !updated) throw new Error(error?.message ?? "Could not update session totals");

  return updated;
}

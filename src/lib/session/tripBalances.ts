import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapSessionRow, mapItemRow, mapParticipantRow, mapItemClaimRow } from "@/lib/mappers";
import { computeEvenSplit, computeSplit, roundShareCents } from "@/lib/calculations/splitEngine";
import type { Session, TripPersonBalance } from "@/types";

// Same aggregation approach as personBalances.ts, but scoped by trip_id instead
// of payer_device_token — a trip's bills can have different payers (whoever
// actually fronted that particular bill), so this deliberately does NOT filter
// by device token. Anyone with the trip's bills already has the individual
// session links anyway; this just rolls them up.
export async function getTripSessionsAndBalances(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  tripId: string,
): Promise<{ sessions: Session[]; people: TripPersonBalance[] }> {
  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  const sessions = (sessionRows ?? []).map(mapSessionRow);
  if (sessions.length === 0) return { sessions: [], people: [] };

  const sessionIds = sessions.map((s) => s.id);

  const [{ data: itemRows }, { data: participantRows }] = await Promise.all([
    supabase.from("items").select("*").in("session_id", sessionIds),
    supabase.from("participants").select("*").in("session_id", sessionIds),
  ]);

  const items = (itemRows ?? []).map(mapItemRow);
  const participants = (participantRows ?? []).map(mapParticipantRow);

  const itemIds = items.map((i) => i.id);
  const { data: claimRows } =
    itemIds.length > 0
      ? await supabase.from("item_claims").select("*").in("item_id", itemIds)
      : { data: [] };
  const claims = (claimRows ?? []).map(mapItemClaimRow);

  const itemsBySession = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsBySession.get(item.sessionId) ?? [];
    list.push(item);
    itemsBySession.set(item.sessionId, list);
  }
  const participantsBySession = new Map<string, typeof participants>();
  for (const participant of participants) {
    const list = participantsBySession.get(participant.sessionId) ?? [];
    list.push(participant);
    participantsBySession.set(participant.sessionId, list);
  }
  const sessionIdByItemId = new Map(items.map((i) => [i.id, i.sessionId]));
  const claimsBySession = new Map<string, typeof claims>();
  for (const claim of claims) {
    const sessionId = sessionIdByItemId.get(claim.itemId);
    if (!sessionId) continue;
    const list = claimsBySession.get(sessionId) ?? [];
    list.push(claim);
    claimsBySession.set(sessionId, list);
  }

  const byName = new Map<string, TripPersonBalance>();

  for (const session of sessions) {
    const sessionItems = itemsBySession.get(session.id) ?? [];
    const sessionParticipants = participantsBySession.get(session.id) ?? [];
    const sessionClaims = claimsBySession.get(session.id) ?? [];
    const guests = sessionParticipants.filter((p) => !p.isPayer);
    if (guests.length === 0) continue;

    const shareById = new Map<string, number>();
    if (session.splitMode === "even") {
      for (const allocation of computeEvenSplit(session.grandTotalCents, sessionParticipants)) {
        shareById.set(
          allocation.participantId,
          roundShareCents(allocation.totalCents, session.roundingPreferenceCents),
        );
      }
    } else {
      const result = computeSplit(
        sessionItems,
        sessionClaims,
        sessionParticipants,
        {
          taxCents: session.taxCents,
          serviceChargeCents: session.serviceChargeCents,
          tipCents: session.tipCents,
          deliveryFeeCents: session.deliveryFeeCents,
          discountCents: session.discountCents,
          grandTotalCents: session.grandTotalCents,
        },
        session.chargeAllocationMode,
      );
      for (const allocation of result.allocations) {
        shareById.set(
          allocation.participantId,
          roundShareCents(allocation.totalCents, session.roundingPreferenceCents),
        );
      }
    }

    for (const guest of guests) {
      const shareCents = shareById.get(guest.id) ?? 0;
      const key = guest.name.trim().toLowerCase();
      const existing = byName.get(key);
      const next: TripPersonBalance = existing ?? {
        name: guest.name.trim(),
        netOwedCents: 0,
        totalOwedCents: 0,
        totalPaidCents: 0,
        billCount: 0,
      };
      next.netOwedCents += shareCents - guest.amountPaidCents;
      next.totalOwedCents += shareCents;
      next.totalPaidCents += guest.amountPaidCents;
      next.billCount += 1;
      byName.set(key, next);
    }
  }

  const people = Array.from(byName.values()).sort((a, b) => b.netOwedCents - a.netOwedCents);
  return { sessions, people };
}

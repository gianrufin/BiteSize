import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { mapSessionRow, mapItemRow, mapParticipantRow, mapItemClaimRow } from "@/lib/mappers";
import { computeEvenSplit, computeSplit, roundShareCents } from "@/lib/calculations/splitEngine";
import type { PersonBalance } from "@/types";

// Only bills THIS device hosted are computable here — for a bill someone else
// hosts, every payer's own row is just named "Payer" in the data, so there's no
// reliable identity to aggregate "what I owe them" across multiple bills. See
// the Groups & Balances spec: this is a documented v1 limitation, not a bug.
const MAX_SESSIONS = 200;

export async function getPersonBalances(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  deviceToken: string | null,
): Promise<PersonBalance[]> {
  if (!deviceToken) return [];

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("*")
    .eq("payer_device_token", deviceToken)
    .order("created_at", { ascending: false })
    .limit(MAX_SESSIONS);

  const sessions = (sessionRows ?? []).map(mapSessionRow);
  if (sessions.length === 0) return [];

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

  interface Accumulator {
    name: string;
    currency: string;
    netOwedCents: number;
    totalOwedCents: number;
    totalPaidCents: number;
    billCount: number;
    unsettledBillCount: number;
    lastBillAt: string;
    lastUnpaidSessionCode: string | null;
  }
  const byKey = new Map<string, Accumulator>();

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
      const key = `${guest.name.trim().toLowerCase()}|${session.currency}`;
      const existing = byKey.get(key);
      const isUnsettled = guest.paymentStatus !== "confirmed" && shareCents > guest.amountPaidCents;

      const next: Accumulator = existing ?? {
        name: guest.name.trim(),
        currency: session.currency,
        netOwedCents: 0,
        totalOwedCents: 0,
        totalPaidCents: 0,
        billCount: 0,
        unsettledBillCount: 0,
        lastBillAt: session.createdAt,
        lastUnpaidSessionCode: null,
      };
      next.netOwedCents += shareCents - guest.amountPaidCents;
      next.totalOwedCents += shareCents;
      next.totalPaidCents += guest.amountPaidCents;
      next.billCount += 1;
      if (isUnsettled) {
        next.unsettledBillCount += 1;
        if (!next.lastUnpaidSessionCode) next.lastUnpaidSessionCode = session.code;
      }
      if (new Date(session.createdAt) > new Date(next.lastBillAt)) {
        next.lastBillAt = session.createdAt;
      }
      byKey.set(key, next);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => b.netOwedCents - a.netOwedCents);
}

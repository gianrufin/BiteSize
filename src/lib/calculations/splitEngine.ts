// Pure, framework-free bill-splitting logic. No Supabase, no React — this module
// is the one piece of the app that must be provably correct, so it's covered by
// splitEngine.test.ts independent of any UI or database wiring.
//
// Money is always integer cents in and integer cents out.

export interface SplitItem {
  id: string;
  totalPriceCents: number;
}

export interface SplitClaim {
  itemId: string;
  participantId: string;
}

export interface SplitParticipant {
  id: string;
  isPayer: boolean;
  excludedFromCharges?: boolean;
}

export type ChargeAllocationMode = "proportional" | "equal";

export interface SplitCharges {
  taxCents: number;
  serviceChargeCents: number;
  tipCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  grandTotalCents: number;
}

export interface ParticipantAllocation {
  participantId: string;
  claimedItemIds: string[];
  itemSubtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  tipCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
}

export interface SplitResult {
  allocations: ParticipantAllocation[];
  unclaimedItemIds: string[];
  unclaimedCents: number;
}

function groupClaimsByItem(claims: SplitClaim[]): Map<string, string[]> {
  const byItem = new Map<string, string[]>();
  for (const claim of claims) {
    const existing = byItem.get(claim.itemId);
    if (existing) {
      existing.push(claim.participantId);
    } else {
      byItem.set(claim.itemId, [claim.participantId]);
    }
  }
  return byItem;
}

// A shared item's cost is split evenly among however many people have currently
// claimed it. Dividing unevenly (e.g. 1000 cents / 3) loses a cent or two here;
// that's expected and gets absorbed by reconcileRounding at the session level,
// not compensated for per item.
function splitItemAmongClaimants(totalPriceCents: number, claimantCount: number): number {
  return Math.round(totalPriceCents / claimantCount);
}

export function computeParticipantSubtotalCents(
  items: SplitItem[],
  claims: SplitClaim[],
  participantId: string,
): number {
  const claimsByItem = groupClaimsByItem(claims);
  return items.reduce((sum, item) => {
    const claimants = claimsByItem.get(item.id) ?? [];
    if (!claimants.includes(participantId)) return sum;
    return sum + splitItemAmongClaimants(item.totalPriceCents, claimants.length);
  }, 0);
}

// Allocates each participant's item subtotal plus their share of
// tax/service/tip/discount. Does NOT reconcile rounding against the receipt's
// real total yet — see reconcileRounding.
//
// chargeAllocationMode "proportional" (default) charges each participant in
// proportion to their share of the whole bill's item subtotal — not just what
// they personally claimed relative to other claimants. "equal" instead splits
// each charge evenly across every non-excluded participant regardless of what
// they ordered. Either way, a participant with excludedFromCharges gets a
// ratio of 0 — their share isn't redistributed to anyone else, it's absorbed
// by the payer via reconcileRounding (the same place rounding remainders go).
export function computeAllocations(
  items: SplitItem[],
  claims: SplitClaim[],
  participants: SplitParticipant[],
  charges: Omit<SplitCharges, "grandTotalCents">,
  chargeAllocationMode: ChargeAllocationMode = "proportional",
): ParticipantAllocation[] {
  const claimsByItem = groupClaimsByItem(claims);
  const itemsSubtotalCents = items.reduce((sum, item) => sum + item.totalPriceCents, 0);
  const includedCount = participants.filter((p) => !p.excludedFromCharges).length;

  return participants.map((participant) => {
    const claimedItemIds = items
      .filter((item) => (claimsByItem.get(item.id) ?? []).includes(participant.id))
      .map((item) => item.id);

    const itemSubtotalCents = computeParticipantSubtotalCents(items, claims, participant.id);

    const ratio = participant.excludedFromCharges
      ? 0
      : chargeAllocationMode === "equal"
        ? includedCount > 0
          ? 1 / includedCount
          : 0
        : itemsSubtotalCents > 0
          ? itemSubtotalCents / itemsSubtotalCents
          : 0;
    const taxCents = Math.round(charges.taxCents * ratio);
    const serviceChargeCents = Math.round(charges.serviceChargeCents * ratio);
    const tipCents = Math.round(charges.tipCents * ratio);
    const deliveryFeeCents = Math.round(charges.deliveryFeeCents * ratio);
    const discountCents = Math.round(charges.discountCents * ratio);

    return {
      participantId: participant.id,
      claimedItemIds,
      itemSubtotalCents,
      taxCents,
      serviceChargeCents,
      tipCents,
      deliveryFeeCents,
      discountCents,
      totalCents:
        itemSubtotalCents +
        taxCents +
        serviceChargeCents +
        tipCents +
        deliveryFeeCents -
        discountCents,
    };
  });
}

// Forces sum(allocations.totalCents) to exactly equal the receipt's real total by
// absorbing the leftover/missing cents into the payer's own allocation — the payer
// already sees the full itemized breakdown, so an extra cent there is invisible
// noise, whereas giving it to a random participant would be a real (if tiny) wrong
// charge. Requires exactly one participant with isPayer: true.
export function reconcileRounding(
  allocations: ParticipantAllocation[],
  grandTotalCents: number,
  participants: SplitParticipant[],
): ParticipantAllocation[] {
  const payer = participants.find((p) => p.isPayer);
  if (!payer) {
    throw new Error("reconcileRounding requires exactly one participant with isPayer: true");
  }

  const sumBeforeReconciliation = allocations.reduce((sum, a) => sum + a.totalCents, 0);
  const diffCents = grandTotalCents - sumBeforeReconciliation;

  if (diffCents === 0) return allocations;

  return allocations.map((allocation) =>
    allocation.participantId === payer.id
      ? { ...allocation, totalCents: allocation.totalCents + diffCents }
      : allocation,
  );
}

export function computeSplit(
  items: SplitItem[],
  claims: SplitClaim[],
  participants: SplitParticipant[],
  charges: SplitCharges,
  chargeAllocationMode: ChargeAllocationMode = "proportional",
): SplitResult {
  const claimsByItem = groupClaimsByItem(claims);
  const unclaimedItemIds = items
    .filter((item) => (claimsByItem.get(item.id) ?? []).length === 0)
    .map((item) => item.id);
  const unclaimedCents = items
    .filter((item) => unclaimedItemIds.includes(item.id))
    .reduce((sum, item) => sum + item.totalPriceCents, 0);

  const rawAllocations = computeAllocations(
    items,
    claims,
    participants,
    charges,
    chargeAllocationMode,
  );
  const allocations = reconcileRounding(rawAllocations, charges.grandTotalCents, participants);

  return { allocations, unclaimedItemIds, unclaimedCents };
}

// Rounds a single participant's share to the nearest rounding unit (in cents —
// 1 means off/exact, 100/500/1000 mean nearest ₱1/₱5/₱10). This is a display/
// request-amount convenience for cash payments, not a ledger operation: each
// participant's own number is rounded independently, with no cross-participant
// reconciliation, since nothing here needs to keep summing to the receipt's
// exact total the way reconcileRounding's payer-absorption does.
export function roundShareCents(cents: number, roundingCents: number): number {
  if (roundingCents <= 1) return cents;
  return Math.round(cents / roundingCents) * roundingCents;
}

export interface EvenSplitAllocation {
  participantId: string;
  totalCents: number;
}

// For bills split evenly by headcount instead of by item claims. Divides the
// grand total as evenly as integer cents allow; any leftover cent(s) from that
// division go to the payer, same rounding philosophy as reconcileRounding.
export function computeEvenSplit(
  grandTotalCents: number,
  participants: SplitParticipant[],
): EvenSplitAllocation[] {
  if (participants.length === 0) return [];

  const payer = participants.find((p) => p.isPayer);
  if (!payer) {
    throw new Error("computeEvenSplit requires exactly one participant with isPayer: true");
  }

  const baseShareCents = Math.floor(grandTotalCents / participants.length);
  const remainderCents = grandTotalCents - baseShareCents * participants.length;

  return participants.map((participant) => ({
    participantId: participant.id,
    totalCents:
      participant.id === payer.id ? baseShareCents + remainderCents : baseShareCents,
  }));
}

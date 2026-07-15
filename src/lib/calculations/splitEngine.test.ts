import { describe, expect, it } from "vitest";
import {
  computeAllocations,
  computeEvenSplit,
  computeParticipantSubtotalCents,
  computeSplit,
  reconcileRounding,
  type SplitClaim,
  type SplitItem,
  type SplitParticipant,
} from "./splitEngine";

const noCharges = {
  taxCents: 0,
  serviceChargeCents: 0,
  tipCents: 0,
  discountCents: 0,
};

describe("computeParticipantSubtotalCents", () => {
  it("sums only items claimed by that participant", () => {
    const items: SplitItem[] = [
      { id: "pizza", totalPriceCents: 2000 },
      { id: "soda", totalPriceCents: 300 },
    ];
    const claims: SplitClaim[] = [
      { itemId: "pizza", participantId: "alex" },
      { itemId: "soda", participantId: "sam" },
    ];

    expect(computeParticipantSubtotalCents(items, claims, "alex")).toBe(2000);
    expect(computeParticipantSubtotalCents(items, claims, "sam")).toBe(300);
  });

  it("splits a shared item evenly among its claimants", () => {
    const items: SplitItem[] = [{ id: "nachos", totalPriceCents: 900 }];
    const claims: SplitClaim[] = [
      { itemId: "nachos", participantId: "alex" },
      { itemId: "nachos", participantId: "sam" },
      { itemId: "nachos", participantId: "jo" },
    ];

    expect(computeParticipantSubtotalCents(items, claims, "alex")).toBe(300);
    expect(computeParticipantSubtotalCents(items, claims, "sam")).toBe(300);
    expect(computeParticipantSubtotalCents(items, claims, "jo")).toBe(300);
  });

  it("returns 0 for a participant with no claims", () => {
    const items: SplitItem[] = [{ id: "pizza", totalPriceCents: 2000 }];
    expect(computeParticipantSubtotalCents(items, [], "alex")).toBe(0);
  });
});

describe("computeAllocations", () => {
  it("prorates tax/service/tip/discount by each participant's share of the item subtotal", () => {
    const items: SplitItem[] = [
      { id: "pizza", totalPriceCents: 3000 },
      { id: "salad", totalPriceCents: 1000 },
    ];
    const claims: SplitClaim[] = [
      { itemId: "pizza", participantId: "alex" },
      { itemId: "salad", participantId: "sam" },
    ];
    const participants: SplitParticipant[] = [
      { id: "alex", isPayer: true },
      { id: "sam", isPayer: false },
    ];
    // total item subtotal = 4000; alex = 75%, sam = 25%
    const charges = {
      taxCents: 400,
      serviceChargeCents: 200,
      tipCents: 400,
      discountCents: 0,
    };

    const [alex, sam] = computeAllocations(items, claims, participants, charges);

    expect(alex.itemSubtotalCents).toBe(3000);
    expect(alex.taxCents).toBe(300); // 75% of 400
    expect(alex.serviceChargeCents).toBe(150); // 75% of 200
    expect(alex.tipCents).toBe(300); // 75% of 400
    expect(alex.totalCents).toBe(3000 + 300 + 150 + 300);

    expect(sam.itemSubtotalCents).toBe(1000);
    expect(sam.taxCents).toBe(100); // 25% of 400
    expect(sam.serviceChargeCents).toBe(50);
    expect(sam.tipCents).toBe(100);
    expect(sam.totalCents).toBe(1000 + 100 + 50 + 100);
  });

  it("applies a discount as a reduction proportional to item subtotal share", () => {
    const items: SplitItem[] = [{ id: "pizza", totalPriceCents: 2000 }];
    const claims: SplitClaim[] = [{ itemId: "pizza", participantId: "alex" }];
    const participants: SplitParticipant[] = [{ id: "alex", isPayer: true }];
    const charges = { taxCents: 0, serviceChargeCents: 0, tipCents: 0, discountCents: 200 };

    const [alex] = computeAllocations(items, claims, participants, charges);
    expect(alex.discountCents).toBe(200);
    expect(alex.totalCents).toBe(1800);
  });

  it("gives a participant with no claims a zero allocation, not an error", () => {
    const items: SplitItem[] = [{ id: "pizza", totalPriceCents: 2000 }];
    const claims: SplitClaim[] = [{ itemId: "pizza", participantId: "alex" }];
    const participants: SplitParticipant[] = [
      { id: "alex", isPayer: true },
      { id: "sam", isPayer: false },
    ];

    const [, sam] = computeAllocations(items, claims, participants, noCharges);
    expect(sam.itemSubtotalCents).toBe(0);
    expect(sam.totalCents).toBe(0);
  });
});

describe("reconcileRounding", () => {
  it("leaves allocations untouched when they already sum to the grand total", () => {
    const allocations = [
      { participantId: "alex", claimedItemIds: [], itemSubtotalCents: 500, taxCents: 0, serviceChargeCents: 0, tipCents: 0, discountCents: 0, totalCents: 500 },
      { participantId: "sam", claimedItemIds: [], itemSubtotalCents: 500, taxCents: 0, serviceChargeCents: 0, tipCents: 0, discountCents: 0, totalCents: 500 },
    ];
    const participants: SplitParticipant[] = [
      { id: "alex", isPayer: true },
      { id: "sam", isPayer: false },
    ];

    const result = reconcileRounding(allocations, 1000, participants);
    expect(result).toEqual(allocations);
  });

  it("absorbs a rounding shortfall into the payer's allocation", () => {
    // 3-way split of 1000 cents: 333 + 333 + 333 = 999, one cent short.
    const items: SplitItem[] = [{ id: "shared", totalPriceCents: 1000 }];
    const claims: SplitClaim[] = [
      { itemId: "shared", participantId: "alex" },
      { itemId: "shared", participantId: "sam" },
      { itemId: "shared", participantId: "jo" },
    ];
    const participants: SplitParticipant[] = [
      { id: "alex", isPayer: true },
      { id: "sam", isPayer: false },
      { id: "jo", isPayer: false },
    ];

    const raw = computeAllocations(items, claims, participants, noCharges);
    const sumBeforeReconciliation = raw.reduce((sum, a) => sum + a.totalCents, 0);
    expect(sumBeforeReconciliation).toBe(999);

    const reconciled = reconcileRounding(raw, 1000, participants);
    const sumAfter = reconciled.reduce((sum, a) => sum + a.totalCents, 0);
    expect(sumAfter).toBe(1000);

    const payerAllocation = reconciled.find((a) => a.participantId === "alex")!;
    expect(payerAllocation.totalCents).toBe(334); // 333 + 1 cent adjustment
  });

  it("throws if no participant is marked as payer", () => {
    const allocations = [
      { participantId: "alex", claimedItemIds: [], itemSubtotalCents: 500, taxCents: 0, serviceChargeCents: 0, tipCents: 0, discountCents: 0, totalCents: 500 },
    ];
    expect(() => reconcileRounding(allocations, 500, [{ id: "alex", isPayer: false }])).toThrow();
  });
});

describe("computeSplit", () => {
  it("flags unclaimed items and excludes them from every participant's subtotal", () => {
    const items: SplitItem[] = [
      { id: "pizza", totalPriceCents: 2000 },
      { id: "mystery-item", totalPriceCents: 450 },
    ];
    const claims: SplitClaim[] = [{ itemId: "pizza", participantId: "alex" }];
    const participants: SplitParticipant[] = [{ id: "alex", isPayer: true }];
    const charges = { ...noCharges, grandTotalCents: 2450 };

    const result = computeSplit(items, claims, participants, charges);

    expect(result.unclaimedItemIds).toEqual(["mystery-item"]);
    expect(result.unclaimedCents).toBe(450);
    // alex's total is reconciled up to cover the grand total including the
    // unclaimed item, since alex is the payer and nobody else claimed it.
    expect(result.allocations[0].totalCents).toBe(2450);
  });

  it("prevents double-claiming from being double-counted: a non-shared item claimed once counts once", () => {
    const items: SplitItem[] = [{ id: "pizza", totalPriceCents: 2000 }];
    const claims: SplitClaim[] = [{ itemId: "pizza", participantId: "alex" }];
    const participants: SplitParticipant[] = [
      { id: "alex", isPayer: true },
      { id: "sam", isPayer: false },
    ];
    const charges = { ...noCharges, grandTotalCents: 2000 };

    const result = computeSplit(items, claims, participants, charges);
    const total = result.allocations.reduce((sum, a) => sum + a.totalCents, 0);
    expect(total).toBe(2000);
    expect(result.allocations.find((a) => a.participantId === "sam")!.totalCents).toBe(0);
  });

  it("produces a full real-world bill that reconciles exactly to the receipt total", () => {
    const items: SplitItem[] = [
      { id: "truffle-pasta", totalPriceCents: 2800 },
      { id: "margherita", totalPriceCents: 1600 },
      { id: "garlic-bread", totalPriceCents: 1000 },
      { id: "caesar-salad", totalPriceCents: 1200 },
      { id: "lemonade", totalPriceCents: 600 },
      { id: "tiramisu", totalPriceCents: 1200 },
    ];
    const claims: SplitClaim[] = [
      { itemId: "truffle-pasta", participantId: "you" },
      { itemId: "margherita", participantId: "james" },
      { itemId: "garlic-bread", participantId: "you" },
      { itemId: "garlic-bread", participantId: "james" },
      { itemId: "garlic-bread", participantId: "sophia" },
      { itemId: "caesar-salad", participantId: "sophia" },
      { itemId: "lemonade", participantId: "daniel" },
      { itemId: "tiramisu", participantId: "daniel" },
    ];
    const participants: SplitParticipant[] = [
      { id: "you", isPayer: true },
      { id: "james", isPayer: false },
      { id: "sophia", isPayer: false },
      { id: "daniel", isPayer: false },
    ];
    const itemsSubtotal = items.reduce((sum, i) => sum + i.totalPriceCents, 0); // 8400
    const charges = {
      taxCents: 0,
      serviceChargeCents: 1125,
      tipCents: 600,
      discountCents: 0,
      grandTotalCents: itemsSubtotal + 1125 + 600,
    };

    const result = computeSplit(items, claims, participants, charges);
    const total = result.allocations.reduce((sum, a) => sum + a.totalCents, 0);

    expect(result.unclaimedItemIds).toEqual([]);
    expect(total).toBe(charges.grandTotalCents);
    // Everyone owes something.
    for (const allocation of result.allocations) {
      expect(allocation.totalCents).toBeGreaterThan(0);
    }
  });
});

describe("computeEvenSplit", () => {
  it("divides the total evenly when it splits with no remainder", () => {
    const participants: SplitParticipant[] = [
      { id: "you", isPayer: true },
      { id: "james", isPayer: false },
      { id: "sophia", isPayer: false },
      { id: "daniel", isPayer: false },
    ];

    const allocations = computeEvenSplit(4000, participants);

    expect(allocations).toEqual([
      { participantId: "you", totalCents: 1000 },
      { participantId: "james", totalCents: 1000 },
      { participantId: "sophia", totalCents: 1000 },
      { participantId: "daniel", totalCents: 1000 },
    ]);
  });

  it("gives the payer the leftover cents from an uneven division", () => {
    const participants: SplitParticipant[] = [
      { id: "you", isPayer: true },
      { id: "james", isPayer: false },
      { id: "sophia", isPayer: false },
    ];

    // 1000 / 3 = 333.33... — each non-payer gets 333, payer absorbs the 1 leftover cent.
    const allocations = computeEvenSplit(1000, participants);
    const total = allocations.reduce((sum, a) => sum + a.totalCents, 0);

    expect(total).toBe(1000);
    expect(allocations.find((a) => a.participantId === "james")?.totalCents).toBe(333);
    expect(allocations.find((a) => a.participantId === "sophia")?.totalCents).toBe(333);
    expect(allocations.find((a) => a.participantId === "you")?.totalCents).toBe(334);
  });

  it("throws when there is no payer", () => {
    const participants: SplitParticipant[] = [
      { id: "james", isPayer: false },
      { id: "sophia", isPayer: false },
    ];

    expect(() => computeEvenSplit(1000, participants)).toThrow();
  });

  it("returns an empty array for no participants", () => {
    expect(computeEvenSplit(1000, [])).toEqual([]);
  });
});

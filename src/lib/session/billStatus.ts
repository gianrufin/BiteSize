import type { PaymentStatus, RecentBillStatus } from "@/types";

export function computePayerRecentBillStatus(
  itemCount: number,
  nonPayerAllocations: { totalCents: number; paymentStatus: PaymentStatus }[],
): { status: RecentBillStatus; outstandingCents: number } {
  const outstandingCents = nonPayerAllocations
    .filter((p) => p.paymentStatus !== "confirmed")
    .reduce((sum, p) => sum + p.totalCents, 0);

  if (itemCount === 0) return { status: "draft", outstandingCents };
  if (nonPayerAllocations.length > 0 && outstandingCents === 0) {
    return { status: "settled", outstandingCents };
  }
  return { status: "awaiting", outstandingCents };
}

export function computeParticipantRecentBillStatus(
  paymentStatus: PaymentStatus,
  myShareCents: number,
): { status: RecentBillStatus; outstandingCents: number } {
  if (paymentStatus === "confirmed") return { status: "settled", outstandingCents: 0 };
  return { status: "awaiting", outstandingCents: myShareCents };
}

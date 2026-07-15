export type SessionStatus = "draft" | "open" | "locked";
export type ItemSource = "ocr" | "manual";
export type SplitMode = "items" | "even";
export type PaymentStatus = "unpaid" | "submitted" | "confirmed";
export type ChargeAllocationMode = "proportional" | "equal";

export interface Session {
  id: string;
  code: string;
  status: SessionStatus;
  payerDeviceToken: string;
  name: string | null;
  venueName: string | null;
  receiptImageUrl: string | null;
  gcashNumber: string | null;
  gcashQrUrl: string | null;
  currency: string;
  splitMode: SplitMode;
  chargeAllocationMode: ChargeAllocationMode;
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  tipCents: number;
  discountCents: number;
  grandTotalCents: number;
  createdAt: string;
  lockedAt: string | null;
}

export interface Item {
  id: string;
  sessionId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  isShared: boolean;
  ocrConfidence: number | null;
  source: ItemSource;
  position: number;
}

export interface Participant {
  id: string;
  sessionId: string;
  name: string;
  deviceToken: string;
  isPayer: boolean;
  paymentStatus: PaymentStatus;
  paymentProofUrl: string | null;
  excludedFromCharges: boolean;
  joinedAt: string;
}

export interface ItemClaim {
  id: string;
  itemId: string;
  participantId: string;
  claimedAt: string;
}

export interface RecentBill {
  code: string;
  name: string;
  date: string;
  totalCents: number;
  currency: string;
  role: "payer" | "participant";
}

export type SessionStatus = "draft" | "open" | "locked";
export type ItemSource = "ocr" | "manual";
export type SplitMode = "items" | "even";
export type PaymentStatus = "unpaid" | "submitted" | "confirmed";
export type PaymentMethod = "gcash" | "cash" | "other";
export type ChargeAllocationMode = "proportional" | "equal";
export type RoundingPreferenceCents = 1 | 100 | 500 | 1000;

export interface Session {
  id: string;
  code: string;
  status: SessionStatus;
  payerDeviceToken: string;
  name: string | null;
  venueName: string | null;
  venueLocation: string | null;
  note: string | null;
  receiptImageUrl: string | null;
  gcashNumber: string | null;
  gcashQrUrl: string | null;
  currency: string;
  splitMode: SplitMode;
  chargeAllocationMode: ChargeAllocationMode;
  roundingPreferenceCents: RoundingPreferenceCents;
  subtotalCents: number;
  taxCents: number;
  serviceChargeCents: number;
  tipCents: number;
  deliveryFeeCents: number;
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
  paymentMethod: PaymentMethod;
  paymentReference: string | null;
  paymentNote: string | null;
  amountPaidCents: number;
  paymentSubmittedAt: string | null;
  paymentConfirmedAt: string | null;
  excludedFromCharges: boolean;
  position: number;
  joinedAt: string;
}

export interface ItemClaim {
  id: string;
  itemId: string;
  participantId: string;
  claimedAt: string;
}

export type RecentBillStatus = "draft" | "awaiting" | "settled";

export interface RecentBill {
  code: string;
  name: string;
  venueName?: string | null;
  date: string;
  totalCents: number;
  currency: string;
  role: "payer" | "participant";
  status: RecentBillStatus;
  outstandingCents: number;
  archived?: boolean;
}

export interface Group {
  id: string;
  name: string;
  memberNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PersonBalance {
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

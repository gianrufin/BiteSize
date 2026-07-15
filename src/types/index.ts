export type SessionStatus = "draft" | "open" | "locked";
export type ItemSource = "ocr" | "manual";

export interface Session {
  id: string;
  code: string;
  status: SessionStatus;
  payerDeviceToken: string;
  name: string | null;
  venueName: string | null;
  receiptImageUrl: string | null;
  gcashNumber: string | null;
  currency: string;
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
  role: "payer" | "participant";
}

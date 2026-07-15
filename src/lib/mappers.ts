import type { Item, ItemClaim, Participant, Session } from "@/types";
import type { Database } from "@/types/database";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["participants"]["Row"];
type ItemClaimRow = Database["public"]["Tables"]["item_claims"]["Row"];

export function mapSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    payerDeviceToken: row.payer_device_token,
    name: row.name,
    venueName: row.venue_name,
    receiptImageUrl: row.receipt_image_url,
    gcashNumber: row.gcash_number,
    gcashQrUrl: row.gcash_qr_url,
    currency: row.currency,
    splitMode: row.split_mode,
    subtotalCents: row.subtotal_cents,
    taxCents: row.tax_cents,
    serviceChargeCents: row.service_charge_cents,
    tipCents: row.tip_cents,
    discountCents: row.discount_cents,
    grandTotalCents: row.grand_total_cents,
    createdAt: row.created_at,
    lockedAt: row.locked_at,
  };
}

export function mapItemRow(row: ItemRow): Item {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    quantity: row.quantity,
    unitPriceCents: row.unit_price_cents,
    totalPriceCents: row.total_price_cents,
    isShared: row.is_shared,
    ocrConfidence: row.ocr_confidence,
    source: row.source,
    position: row.position,
  };
}

export function mapParticipantRow(row: ParticipantRow): Participant {
  return {
    id: row.id,
    sessionId: row.session_id,
    name: row.name,
    deviceToken: row.device_token,
    isPayer: row.is_payer,
    paymentStatus: row.payment_status,
    paymentProofUrl: row.payment_proof_url,
    joinedAt: row.joined_at,
  };
}

export function mapItemClaimRow(row: ItemClaimRow): ItemClaim {
  return {
    id: row.id,
    itemId: row.item_id,
    participantId: row.participant_id,
    claimedAt: row.claimed_at,
  };
}

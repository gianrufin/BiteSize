import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { recomputeSessionTotals } from "@/lib/session/recomputeTotals";
import { mapItemRow, mapSessionRow } from "@/lib/mappers";
import { lockedResponse } from "@/lib/session/locking";
import { extractReceiptItems } from "@/lib/ai/receiptVision";

export const maxDuration = 60;

const SUPPORTED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const deviceToken = await getDeviceToken();
  if (deviceToken !== session.payer_device_token) {
    return NextResponse.json(
      { error: "Only the payer can scan a receipt" },
      { status: 403 },
    );
  }

  if (session.status === "locked") {
    return lockedResponse();
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const mediaType = SUPPORTED_MEDIA_TYPES.has(file.type) ? file.type : "image/jpeg";
  const imageBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  let extracted;
  try {
    extracted = await extractReceiptItems(
      imageBase64,
      mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not read that receipt" },
      { status: 502 },
    );
  }

  const validItems = extracted.filter(
    (item) =>
      item.name.trim().length > 0 &&
      Number.isFinite(item.quantity) &&
      item.quantity > 0 &&
      Number.isFinite(item.unitPriceCents) &&
      item.unitPriceCents >= 0,
  );

  if (validItems.length === 0) {
    const updatedSession = await recomputeSessionTotals(session.id);
    return NextResponse.json(
      { items: [], session: mapSessionRow(updatedSession) },
      { status: 201 },
    );
  }

  const { count: existingItemCount } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id);

  const startPosition = existingItemCount ?? 0;

  const { data: insertedItems, error } = await supabase
    .from("items")
    .insert(
      validItems.map((item, index) => ({
        session_id: session.id,
        name: item.name.trim(),
        quantity: item.quantity,
        unit_price_cents: Math.round(item.unitPriceCents),
        total_price_cents: Math.round(item.quantity * item.unitPriceCents),
        source: "ocr" as const,
        ocr_confidence: Math.max(0, Math.min(1, item.confidence)),
        position: startPosition + index,
      })),
    )
    .select("*");

  if (error || !insertedItems) {
    return NextResponse.json(
      { error: error?.message ?? "Could not save extracted items" },
      { status: 500 },
    );
  }

  const updatedSession = await recomputeSessionTotals(session.id);

  return NextResponse.json(
    {
      items: insertedItems.map(mapItemRow),
      session: mapSessionRow(updatedSession),
    },
    { status: 201 },
  );
}

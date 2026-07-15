import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapItemRow, mapItemClaimRow, mapParticipantRow } from "@/lib/mappers";
import { AppHeader } from "@/components/AppHeader";
import { ItemEditor } from "@/components/ItemEditor";
import { ItemClaimList, type ClaimWithName } from "@/components/ItemClaimList";
import { GCashNumberCard } from "@/components/GCashNumberCard";
import { GCashPaymentInfo } from "@/components/GCashPaymentInfo";
import { RealtimeSync } from "@/components/RealtimeSync";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createServerSupabaseClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("code", code)
    .single();

  if (!session) notFound();

  const deviceToken = await getDeviceToken();
  const isPayer = deviceToken === session.payer_device_token;

  const { data: itemRows } = await supabase
    .from("items")
    .select("*")
    .eq("session_id", session.id)
    .order("position", { ascending: true });

  const items = (itemRows ?? []).map(mapItemRow);

  const { data: participantRows } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", session.id);
  const participants = (participantRows ?? []).map(mapParticipantRow);

  const itemIds = items.map((item) => item.id);
  const { data: claimRows } =
    itemIds.length > 0
      ? await supabase.from("item_claims").select("*").in("item_id", itemIds)
      : { data: [] };
  const claims = (claimRows ?? []).map(mapItemClaimRow);
  const participantNameById = new Map(participants.map((p) => [p.id, p.name]));
  const claimsWithNames: ClaimWithName[] = claims.map((c) => ({
    itemId: c.itemId,
    participantId: c.participantId,
    participantName: participantNameById.get(c.participantId) ?? "Someone",
  }));

  const currentParticipant = deviceToken
    ? participants.find((p) => p.deviceToken === deviceToken)
    : undefined;

  const allParticipants = participants.map((p) => ({ id: p.id, isPayer: p.isPayer }));
  const isLocked = session.status === "locked";
  const charges = {
    taxCents: session.tax_cents,
    serviceChargeCents: session.service_charge_cents,
    tipCents: session.tip_cents,
    discountCents: session.discount_cents,
    grandTotalCents: session.grand_total_cents,
  };

  if (isPayer) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
        <RealtimeSync sessionId={session.id} />
        <AppHeader />
        <div className="mt-6 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">
            {session.name ?? "New bill"}
          </h1>
          <div className="flex shrink-0 gap-2">
            <a
              href={`/s/${session.code}/join`}
              className="card px-3 py-2 text-sm font-medium text-accent"
            >
              Share
            </a>
            <a
              href={`/s/${session.code}/summary`}
              className="btn-primary px-3 py-2 text-sm font-medium"
            >
              Summary
            </a>
          </div>
        </div>
        <div className="mt-6">
          <ItemEditor
            key={JSON.stringify(items)}
            session={{
              code: session.code,
              name: session.name,
              subtotalCents: session.subtotal_cents,
              grandTotalCents: session.grand_total_cents,
            }}
            items={items}
            isLocked={isLocked}
          />
        </div>

        <div className="mt-4">
          <GCashNumberCard
            sessionCode={session.code}
            initialGcashNumber={session.gcash_number}
          />
        </div>

        {items.length > 0 && currentParticipant ? (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-muted">
              What did you have?
            </h2>
            <ItemClaimList
              key={JSON.stringify(items) + JSON.stringify(claimsWithNames)}
              sessionCode={session.code}
              items={items}
              initialClaims={claimsWithNames}
              currentParticipantId={currentParticipant.id}
              allParticipants={allParticipants}
              charges={charges}
              isBillLocked={isLocked}
            />
          </div>
        ) : null}
      </main>
    );
  }

  if (!currentParticipant) {
    redirect(`/s/${session.code}/join`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <RealtimeSync sessionId={session.id} />
      <AppHeader />
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "Bill"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        You&apos;ve joined as {currentParticipant.name}
      </p>

      {session.gcash_number ? (
        <div className="mt-4">
          <GCashPaymentInfo gcashNumber={session.gcash_number} />
        </div>
      ) : null}

      <div className="mt-6">
        <ItemClaimList
          key={JSON.stringify(items) + JSON.stringify(claimsWithNames)}
          sessionCode={session.code}
          items={items}
          initialClaims={claimsWithNames}
          currentParticipantId={currentParticipant.id}
          allParticipants={allParticipants}
          charges={charges}
          isBillLocked={isLocked}
        />
      </div>
    </main>
  );
}

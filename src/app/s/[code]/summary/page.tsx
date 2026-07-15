import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapItemRow, mapItemClaimRow, mapParticipantRow } from "@/lib/mappers";
import { computeEvenSplit, computeSplit, roundShareCents } from "@/lib/calculations/splitEngine";
import { formatCents } from "@/lib/format";
import { AppHeader } from "@/components/AppHeader";
import { SummaryView } from "@/components/SummaryView";
import { PaymentPanel } from "@/components/PaymentPanel";
import { RealtimeSync } from "@/components/RealtimeSync";
import { TrackRecentBill } from "@/components/TrackRecentBill";
import { computeParticipantRecentBillStatus } from "@/lib/session/billStatus";

export default async function SummaryPage({
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

  // The payer sees every participant's amount and the full breakdown; everyone
  // else only ever sees their own total — same summary route, different depth.
  if (isPayer) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
        <RealtimeSync sessionId={session.id} />
        <AppHeader
          right={
            <a href={`/s/${session.code}`} className="text-sm font-medium text-accent">
              ← Back
            </a>
          }
        />
        <h1 className="mt-6 text-2xl font-semibold text-text">
          {session.name ?? "Bill Summary"}
        </h1>

        <div className="mt-6">
          <SummaryView
            key={`${session.status}-${session.tax_cents}-${session.service_charge_cents}-${session.tip_cents}-${session.discount_cents}-${JSON.stringify(items)}-${JSON.stringify(claims)}-${JSON.stringify(participants)}`}
            sessionCode={session.code}
            initialSession={{
              name: session.name,
              status: session.status,
              currency: session.currency,
              splitMode: session.split_mode,
              chargeAllocationMode: session.charge_allocation_mode,
              roundingPreferenceCents: session.rounding_preference_cents as 1 | 100 | 500 | 1000,
              subtotalCents: session.subtotal_cents,
              taxCents: session.tax_cents,
              serviceChargeCents: session.service_charge_cents,
              tipCents: session.tip_cents,
              discountCents: session.discount_cents,
              grandTotalCents: session.grand_total_cents,
            }}
            items={items}
            participants={participants.map((p) => ({
              id: p.id,
              name: p.name,
              isPayer: p.isPayer,
              paymentStatus: p.paymentStatus,
              paymentProofUrl: p.paymentProofUrl,
              excludedFromCharges: p.excludedFromCharges,
            }))}
            claims={claims.map((c) => ({
              itemId: c.itemId,
              participantId: c.participantId,
            }))}
          />
        </div>
      </main>
    );
  }

  const currentParticipant = deviceToken
    ? participants.find((p) => p.deviceToken === deviceToken)
    : undefined;

  if (!currentParticipant) {
    redirect(`/s/${session.code}/join`);
  }

  const allParticipants = participants.map((p) => ({
    id: p.id,
    isPayer: p.isPayer,
    excludedFromCharges: p.excludedFromCharges,
  }));
  const charges = {
    taxCents: session.tax_cents,
    serviceChargeCents: session.service_charge_cents,
    tipCents: session.tip_cents,
    discountCents: session.discount_cents,
    grandTotalCents: session.grand_total_cents,
  };

  const myShareCents = roundShareCents(
    session.split_mode === "even"
      ? (computeEvenSplit(charges.grandTotalCents, allParticipants).find(
          (a) => a.participantId === currentParticipant.id,
        )?.totalCents ?? 0)
      : (computeSplit(
          items.map((item) => ({ id: item.id, totalPriceCents: item.totalPriceCents })),
          claims,
          allParticipants,
          charges,
          session.charge_allocation_mode,
        ).allocations.find((a) => a.participantId === currentParticipant.id)?.totalCents ??
        0),
    session.rounding_preference_cents,
  );

  const { status: myRecentBillStatus, outstandingCents: myOutstandingCents } =
    computeParticipantRecentBillStatus(currentParticipant.paymentStatus, myShareCents);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <RealtimeSync sessionId={session.id} />
      <TrackRecentBill
        code={session.code}
        name={session.name ?? "Bill"}
        venueName={session.venue_name}
        totalCents={myShareCents}
        currency={session.currency}
        role="participant"
        status={myRecentBillStatus}
        outstandingCents={myOutstandingCents}
      />
      <AppHeader
        right={
          <a href={`/s/${session.code}`} className="text-sm font-medium text-accent">
            ← Back
          </a>
        }
      />
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "Bill Summary"}
      </h1>
      <p className="mt-1 text-sm text-muted">Joined as {currentParticipant.name}</p>

      <div className="mt-6 card p-5 text-center">
        <p className="text-sm text-muted">You owe</p>
        <p className="text-4xl font-semibold text-text">
          {formatCents(myShareCents, session.currency)}
        </p>
      </div>

      <div className="mt-4">
        <PaymentPanel
          sessionCode={session.code}
          participantId={currentParticipant.id}
          billName={session.name ?? "Bill"}
          amountCents={myShareCents}
          currency={session.currency}
          gcashNumber={session.gcash_number}
          gcashQrUrl={session.gcash_qr_url}
          initialPaymentStatus={currentParticipant.paymentStatus}
          initialProofUrl={currentParticipant.paymentProofUrl}
        />
      </div>
    </main>
  );
}

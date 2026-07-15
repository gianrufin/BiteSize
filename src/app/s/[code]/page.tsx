import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapItemRow, mapItemClaimRow, mapParticipantRow } from "@/lib/mappers";
import { computeEvenSplit, computeSplit } from "@/lib/calculations/splitEngine";
import { AppHeader } from "@/components/AppHeader";
import { BillTitleEditor } from "@/components/BillTitleEditor";
import { ItemEditor } from "@/components/ItemEditor";
import { ItemClaimList, type ClaimWithName } from "@/components/ItemClaimList";
import { GCashNumberCard } from "@/components/GCashNumberCard";
import { GCashQrUpload } from "@/components/GCashQrUpload";
import { PaymentPanel } from "@/components/PaymentPanel";
import { RealtimeSync } from "@/components/RealtimeSync";
import { SplitModeToggle } from "@/components/SplitModeToggle";
import { NudgeParticipants } from "@/components/NudgeParticipants";
import { TrackRecentBill } from "@/components/TrackRecentBill";
import {
  computePayerRecentBillStatus,
  computeParticipantRecentBillStatus,
} from "@/lib/session/billStatus";

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

  const allParticipants = participants.map((p) => ({
    id: p.id,
    isPayer: p.isPayer,
    excludedFromCharges: p.excludedFromCharges,
  }));
  const isLocked = session.status === "locked";
  const charges = {
    taxCents: session.tax_cents,
    serviceChargeCents: session.service_charge_cents,
    tipCents: session.tip_cents,
    discountCents: session.discount_cents,
    grandTotalCents: session.grand_total_cents,
  };

  if (isPayer) {
    const payerAllocations =
      session.split_mode === "even"
        ? computeEvenSplit(charges.grandTotalCents, allParticipants)
        : computeSplit(
            items.map((item) => ({ id: item.id, totalPriceCents: item.totalPriceCents })),
            claims,
            allParticipants,
            charges,
            session.charge_allocation_mode,
          ).allocations;
    const payerAllocationById = new Map(payerAllocations.map((a) => [a.participantId, a]));
    const nonPayerAllocations = participants
      .filter((p) => !p.isPayer)
      .map((p) => ({
        totalCents: payerAllocationById.get(p.id)?.totalCents ?? 0,
        paymentStatus: p.paymentStatus,
      }));
    const { status: recentBillStatus, outstandingCents } = computePayerRecentBillStatus(
      items.length,
      nonPayerAllocations,
    );

    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
        <RealtimeSync sessionId={session.id} />
        <TrackRecentBill
          code={session.code}
          name={session.name ?? "New bill"}
          venueName={session.venue_name}
          totalCents={session.grand_total_cents}
          currency={session.currency}
          role="payer"
          status={recentBillStatus}
          outstandingCents={outstandingCents}
        />
        <AppHeader />
        <div className="mt-6 flex items-start justify-between gap-3">
          <BillTitleEditor
            sessionCode={session.code}
            initialName={session.name}
            initialVenueName={session.venue_name}
          />
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
        <div className="mt-4">
          <SplitModeToggle
            sessionCode={session.code}
            initialSplitMode={session.split_mode}
            disabled={isLocked}
          />
        </div>

        <div className="mt-6">
          <ItemEditor
            key={JSON.stringify(items)}
            session={{
              code: session.code,
              name: session.name,
              currency: session.currency,
              subtotalCents: session.subtotal_cents,
              grandTotalCents: session.grand_total_cents,
            }}
            items={items}
            isLocked={isLocked}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <GCashNumberCard
            sessionCode={session.code}
            initialGcashNumber={session.gcash_number}
          />
          <GCashQrUpload
            sessionCode={session.code}
            initialGcashQrUrl={session.gcash_qr_url}
          />
        </div>

        {(items.length > 0 || session.split_mode === "even") && currentParticipant ? (
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
              currency={session.currency}
              splitMode={session.split_mode}
              chargeAllocationMode={session.charge_allocation_mode}
              isBillLocked={isLocked}
            />
          </div>
        ) : null}

        {session.split_mode === "items" && items.length > 0 ? (
          <div className="mt-4">
            <NudgeParticipants
              billName={session.name ?? "this bill"}
              sessionCode={session.code}
              participants={participants}
              claims={claims}
            />
          </div>
        ) : null}
      </main>
    );
  }

  if (!currentParticipant) {
    redirect(`/s/${session.code}/join`);
  }

  const myShareCents =
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
        0);

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
          <a
            href={`/s/${session.code}/summary`}
            className="text-sm font-medium text-accent"
          >
            Summary
          </a>
        }
      />
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "Bill"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        You&apos;ve joined as {currentParticipant.name}
      </p>

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

      <div className="mt-6">
        <ItemClaimList
          key={JSON.stringify(items) + JSON.stringify(claimsWithNames)}
          sessionCode={session.code}
          items={items}
          initialClaims={claimsWithNames}
          currentParticipantId={currentParticipant.id}
          allParticipants={allParticipants}
          charges={charges}
          currency={session.currency}
          splitMode={session.split_mode}
          chargeAllocationMode={session.charge_allocation_mode}
          isBillLocked={isLocked}
        />
      </div>
    </main>
  );
}

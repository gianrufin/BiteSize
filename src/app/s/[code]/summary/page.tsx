import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapItemRow, mapItemClaimRow, mapParticipantRow } from "@/lib/mappers";
import { Logo } from "@/components/Logo";
import { SummaryView } from "@/components/SummaryView";

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

  // The summary shows every participant's amount — only the payer should see
  // that, everyone else only ever sees their own total.
  if (!isPayer) {
    redirect(`/s/${session.code}`);
  }

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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <div className="flex items-center justify-between">
        <Logo size={40} />
        <a href={`/s/${session.code}`} className="text-sm font-medium text-accent">
          ← Back
        </a>
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "Bill Summary"}
      </h1>

      <div className="mt-6">
        <SummaryView
          sessionCode={session.code}
          initialSession={{
            name: session.name,
            status: session.status,
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

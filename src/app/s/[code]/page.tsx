import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapItemRow, mapItemClaimRow, mapParticipantRow } from "@/lib/mappers";
import { Logo } from "@/components/Logo";
import { ItemEditor } from "@/components/ItemEditor";
import { ItemClaimList, type ClaimWithName } from "@/components/ItemClaimList";

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

  if (isPayer) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
        <Logo size={40} />
        <div className="mt-6 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-text">
            {session.name ?? "New bill"}
          </h1>
          <a
            href={`/s/${session.code}/join`}
            className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-medium text-accent"
          >
            Share
          </a>
        </div>
        <div className="mt-6">
          <ItemEditor
            session={{
              code: session.code,
              name: session.name,
              subtotalCents: session.subtotal_cents,
              grandTotalCents: session.grand_total_cents,
            }}
            items={items}
          />
        </div>

        {items.length > 0 && currentParticipant ? (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-medium text-muted">
              What did you have?
            </h2>
            <ItemClaimList
              sessionCode={session.code}
              items={items}
              initialClaims={claimsWithNames}
              currentParticipantId={currentParticipant.id}
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
      <Logo size={40} />
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "Bill"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        You&apos;ve joined as {currentParticipant.name}
      </p>

      <div className="mt-6">
        <ItemClaimList
          sessionCode={session.code}
          items={items}
          initialClaims={claimsWithNames}
          currentParticipantId={currentParticipant.id}
        />
      </div>
    </main>
  );
}

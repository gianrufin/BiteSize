import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapItemRow } from "@/lib/mappers";
import { formatCents } from "@/lib/format";
import { Logo } from "@/components/Logo";
import { ItemEditor } from "@/components/ItemEditor";

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
      </main>
    );
  }

  let participantName: string | null = null;
  if (deviceToken) {
    const { data: participant } = await supabase
      .from("participants")
      .select("name")
      .eq("session_id", session.id)
      .eq("device_token", deviceToken)
      .maybeSingle();
    participantName = participant?.name ?? null;
  }

  if (!participantName) {
    redirect(`/s/${session.code}/join`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <Logo size={40} />
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "Bill"}
      </h1>
      <p className="mt-1 text-sm text-muted">You&apos;ve joined as {participantName}</p>

      <div className="mt-6 flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
              {item.quantity}
            </div>
            <div className="flex-1">
              <p className="font-medium text-text">{item.name}</p>
              <p className="text-sm text-muted">{formatCents(item.unitPriceCents)} each</p>
            </div>
            <span className="font-medium text-text">
              {formatCents(item.totalPriceCents)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Claiming your items is coming in the next update.
      </p>
    </main>
  );
}

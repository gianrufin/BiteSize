import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapItemRow } from "@/lib/mappers";
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <Logo size={40} />
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "New bill"}
      </h1>

      {isPayer ? (
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
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">
            This bill isn&apos;t open for joining yet — check back once the
            payer shares the QR code.
          </p>
        </div>
      )}
    </main>
  );
}

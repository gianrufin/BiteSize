import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { Logo } from "@/components/Logo";

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

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <Logo size={40} />
      <div className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <p className="text-sm text-muted">
          {isPayer ? "You're paying" : "Bill session"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-text">
          {session.name ?? "New bill"}
        </h1>
        <p className="mt-4 text-sm text-muted">
          Session code <span className="font-mono text-text">{session.code}</span>
        </p>
        <p className="mt-6 text-sm text-muted">
          Item entry, QR sharing, and claiming are coming next in the build — this
          page confirms the session was created and your role was detected
          correctly.
        </p>
      </div>
    </main>
  );
}

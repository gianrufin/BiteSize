import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { getBaseUrl } from "@/lib/session/baseUrl";
import { AppHeader } from "@/components/AppHeader";
import { QRCodeCard } from "@/components/QRCodeCard";
import { JoinForm } from "@/components/JoinForm";

export default async function JoinPage({
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

  if (!session) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12 text-center">
        <AppHeader />
        <p className="mt-10 text-text">This bill link doesn&apos;t exist or has expired.</p>
      </main>
    );
  }

  const deviceToken = await getDeviceToken();
  const isPayer = deviceToken === session.payer_device_token;

  let alreadyJoinedName: string | null = null;
  if (!isPayer && deviceToken) {
    const { data: existingParticipant } = await supabase
      .from("participants")
      .select("name")
      .eq("session_id", session.id)
      .eq("device_token", deviceToken)
      .maybeSingle();
    alreadyJoinedName = existingParticipant?.name ?? null;
  }

  const baseUrl = await getBaseUrl();
  const joinUrl = `${baseUrl}/s/${session.code}/join`;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader />
      <h1 className="mt-6 text-2xl font-semibold text-text">
        {session.name ?? "Join this bill"}
      </h1>

      <div className="mt-6">
        <QRCodeCard url={joinUrl} />
      </div>

      {isPayer ? (
        <div className="mt-4 card p-4 text-center">
          <p className="text-sm text-muted">You created this bill.</p>
          <a href={`/s/${session.code}`} className="mt-2 inline-block font-medium text-accent">
            Go to your bill →
          </a>
        </div>
      ) : alreadyJoinedName ? (
        <div className="mt-4 card p-4 text-center">
          <p className="text-sm text-muted">
            You&apos;ve already joined as {alreadyJoinedName}.
          </p>
          <a href={`/s/${session.code}`} className="mt-2 inline-block font-medium text-accent">
            Go to the bill →
          </a>
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-3 text-sm text-muted">
            Enter your name to join and claim what you ordered.
          </p>
          <JoinForm code={session.code} />
        </div>
      )}
    </main>
  );
}

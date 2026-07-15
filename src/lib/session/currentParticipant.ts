import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getDeviceToken } from "@/lib/session/deviceToken";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

// Looks up the current browser's participant row for a session by device token.
// Works uniformly for the payer and joined participants alike, since the payer
// gets their own participants row (is_payer: true) at session-creation time.
export async function getCurrentParticipant(
  supabase: SupabaseClient<Database>,
  session: SessionRow,
) {
  const deviceToken = await getDeviceToken();
  if (!deviceToken) return null;

  const { data } = await supabase
    .from("participants")
    .select("*")
    .eq("session_id", session.id)
    .eq("device_token", deviceToken)
    .maybeSingle();

  return data;
}

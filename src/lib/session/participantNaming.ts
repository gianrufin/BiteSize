import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Two participants can legitimately share a name — device token is the real
// identity key, not the name string — but an unqualified duplicate is
// indistinguishable everywhere it's displayed (claim chips, summary rows).
// Disambiguate by order: "Alex", "Alex (2)", "Alex (3)"...
export async function resolveUniqueParticipantName(
  supabase: SupabaseClient<Database>,
  sessionId: string,
  requestedName: string,
): Promise<string> {
  const { data: existingNames } = await supabase
    .from("participants")
    .select("name")
    .eq("session_id", sessionId);

  const takenNames = new Set((existingNames ?? []).map((p) => p.name.toLowerCase()));
  if (!takenNames.has(requestedName.toLowerCase())) return requestedName;

  let suffix = 2;
  while (takenNames.has(`${requestedName} (${suffix})`.toLowerCase())) suffix++;
  return `${requestedName} (${suffix})`;
}

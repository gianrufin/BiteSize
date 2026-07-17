import type { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateSessionCode } from "@/lib/session/code";

export interface CreateSessionInput {
  name: string | null;
  gcashNumber: string | null;
  gcashQrUrl: string | null;
  splitMode?: "items" | "even";
  currency?: string;
  tripId?: string | null;
}

export interface CreateSessionResult {
  code: string;
  error?: string;
}

// Shared by POST /api/sessions and POST /api/trips/[code]/sessions — a trip bill
// is a normal session in every respect except it carries a trip_id. Session codes
// are generated request-side and retried on collision rather than left to the DB,
// since `code` needs to be known before the row exists to build the share link.
export async function createSessionRow(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  deviceToken: string,
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateSessionCode();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        code,
        payer_device_token: deviceToken,
        name: input.name,
        gcash_number: input.gcashNumber,
        gcash_qr_url: input.gcashQrUrl,
        status: "draft",
        currency: input.currency ?? "PHP",
        trip_id: input.tripId ?? null,
        ...(input.splitMode ? { split_mode: input.splitMode } : {}),
      })
      .select("id, code")
      .single();

    if (!error && data) {
      // The payer needs a participants row too, so they can claim their own
      // items through the same claims flow as everyone else (Day 5) instead of
      // being a special case throughout the rest of the app. Stored as "Payer"
      // rather than "You" — this name is what *other* participants see next to
      // shared items, and "You" would misleadingly read as referring to them.
      await supabase.from("participants").insert({
        session_id: data.id,
        name: "Payer",
        device_token: deviceToken,
        is_payer: true,
      });

      return { code: data.code };
    }

    // Unique violation on `code` — regenerate and retry. Any other error is fatal.
    if (error && error.code !== "23505") {
      return { code: "", error: error.message };
    }
  }

  return { code: "", error: "Could not allocate a session code, please try again" };
}

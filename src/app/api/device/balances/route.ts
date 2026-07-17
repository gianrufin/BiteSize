import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { getPersonBalances } from "@/lib/session/personBalances";

export async function GET() {
  const deviceToken = await getDeviceToken();
  const supabase = createServerSupabaseClient();
  const people = await getPersonBalances(supabase, deviceToken);
  return NextResponse.json({ people });
}

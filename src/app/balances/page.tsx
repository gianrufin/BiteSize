import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { getPersonBalances } from "@/lib/session/personBalances";
import { AppHeader } from "@/components/AppHeader";
import { BalancesList } from "@/components/BalancesList";

export default async function BalancesPage() {
  const deviceToken = await getDeviceToken();
  const supabase = createServerSupabaseClient();
  const people = await getPersonBalances(supabase, deviceToken);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader
        right={
          <Link href="/" className="text-sm font-medium text-accent">
            ← Back
          </Link>
        }
      />
      <h1 className="mt-6 text-2xl font-semibold text-text">Balances</h1>
      <p className="mt-1 text-sm text-muted">
        A running total of what people owe you, across every bill you&apos;ve
        hosted.
      </p>

      {people.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-sm text-muted">
            Nothing here yet — host a few bills with the same people and
            they&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <BalancesList people={people} />
        </div>
      )}
    </main>
  );
}

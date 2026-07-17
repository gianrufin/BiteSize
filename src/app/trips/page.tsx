import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapTripRow } from "@/lib/mappers";
import { AppHeader } from "@/components/AppHeader";
import { StartTripForm } from "@/components/StartTripForm";

export default async function TripsPage() {
  const deviceToken = await getDeviceToken();
  const supabase = createServerSupabaseClient();

  const { data } = deviceToken
    ? await supabase
        .from("trips")
        .select("*")
        .eq("organizer_device_token", deviceToken)
        .order("created_at", { ascending: false })
    : { data: [] };
  const trips = (data ?? []).map(mapTripRow);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader
        right={
          <Link href="/" className="text-sm font-medium text-accent">
            ← Back
          </Link>
        }
      />
      <h1 className="mt-6 text-2xl font-semibold text-text">Trips</h1>
      <p className="mt-1 text-sm text-muted">
        Bundle a weekend or a night out into one trip, add each bill as it
        happens, and settle everything at the end instead of bill by bill.
      </p>

      <div className="mt-5">
        <StartTripForm />
      </div>

      {trips.length > 0 ? (
        <div className="mt-6 flex flex-col gap-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/t/${trip.code}`}
              className="card flex items-center justify-between p-4"
            >
              <div>
                <p className="font-medium text-text">{trip.name}</p>
                <p className="text-xs text-muted">
                  {new Date(trip.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  trip.status === "settled"
                    ? "bg-surface-muted text-muted"
                    : "bg-accent-soft text-accent"
                }`}
              >
                {trip.status === "settled" ? "Settled" : "Open"}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </main>
  );
}

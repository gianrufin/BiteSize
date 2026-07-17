import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDeviceToken } from "@/lib/session/deviceToken";
import { mapTripRow } from "@/lib/mappers";
import { getTripSessionsAndBalances } from "@/lib/session/tripBalances";
import { formatCents } from "@/lib/format";
import { AppHeader } from "@/components/AppHeader";
import { Avatar } from "@/components/Avatar";
import { AddBillToTripButton } from "@/components/AddBillToTripButton";
import { TripSettleControls } from "@/components/TripSettleControls";

export default async function TripPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = createServerSupabaseClient();
  const { data: tripRow } = await supabase.from("trips").select("*").eq("code", code).single();

  if (!tripRow) notFound();

  const trip = mapTripRow(tripRow);
  const deviceToken = await getDeviceToken();
  const isOrganizer = deviceToken === trip.organizerDeviceToken;
  const { sessions, people } = await getTripSessionsAndBalances(supabase, trip.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-24 pt-12">
      <AppHeader
        right={
          <Link href="/trips" className="text-sm font-medium text-accent">
            ← Trips
          </Link>
        }
      />

      <div className="mt-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">{trip.name}</h1>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            trip.status === "settled"
              ? "bg-surface-muted text-muted"
              : "bg-accent-soft text-accent"
          }`}
        >
          {trip.status === "settled" ? "Settled" : "Open"}
        </span>
      </div>

      {isOrganizer ? <TripSettleControls tripCode={trip.code} status={trip.status} /> : null}

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-muted">Bills on this trip</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">No bills yet — add the first one below.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/s/${session.code}`}
                className="card flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-medium text-text">{session.name ?? "Untitled bill"}</p>
                  <p className="text-xs text-muted">
                    {new Date(session.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p className="font-semibold text-text">
                  {formatCents(session.grandTotalCents, session.currency)}
                </p>
              </Link>
            ))}
          </div>
        )}
        {trip.status === "open" ? (
          <div className="mt-3">
            <AddBillToTripButton tripCode={trip.code} />
          </div>
        ) : null}
      </section>

      {isOrganizer && people.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-muted">
            Combined total across this trip
          </h2>
          <div className="flex flex-col gap-2">
            {people.map((person) => (
              <div key={person.name} className="card flex items-center gap-3 p-4">
                <Avatar id={person.name} name={person.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{person.name}</p>
                  <p className="text-xs text-muted">
                    {person.billCount} {person.billCount === 1 ? "bill" : "bills"}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-semibold ${
                    person.netOwedCents > 0 ? "text-text" : "text-muted"
                  }`}
                >
                  {person.netOwedCents > 0
                    ? formatCents(person.netOwedCents, trip.currency)
                    : "Settled"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

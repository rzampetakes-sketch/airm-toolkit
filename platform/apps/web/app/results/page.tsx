"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmptyLegListing, FlightOffer } from "@travel-platform/types";
import { apiGet, apiPost } from "../../lib/api";
import { getCurrentUserId } from "../../lib/auth";

export default function ResultsPage() {
  return (
    <Suspense fallback={<PageShell>Loading…</PageShell>}>
      <ResultsContent />
    </Suspense>
  );
}

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") === "empty_leg" ? "empty_leg" : "flight";

  const [flights, setFlights] = useState<FlightOffer[] | null>(null);
  const [emptyLegs, setEmptyLegs] = useState<EmptyLegListing[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    setError(null);

    if (type === "flight") {
      const query = new URLSearchParams({
        origin: searchParams.get("origin") ?? "",
        destination: searchParams.get("destination") ?? "",
        departureDate: searchParams.get("departureDate") ?? "",
        cabinClass: searchParams.get("cabinClass") ?? "business",
        passengers: searchParams.get("passengers") ?? "1",
      });
      apiGet<FlightOffer[]>(`/flights/search?${query}`)
        .then(setFlights)
        .catch((err) => setError(err.message));
    } else {
      const query = new URLSearchParams({
        origin: searchParams.get("origin") ?? "",
        destination: searchParams.get("destination") ?? "",
        earliestDeparture: searchParams.get("earliestDeparture") ?? new Date().toISOString(),
        latestDeparture: searchParams.get("latestDeparture") ?? new Date(Date.now() + 14 * 24 * 3_600_000).toISOString(),
      });
      apiGet<EmptyLegListing[]>(`/empty-legs/search?${query}`)
        .then(setEmptyLegs)
        .catch((err) => setError(err.message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, searchParams.toString()]);

  async function selectFlight(offer: FlightOffer) {
    setSelectingId(offer.id);
    try {
      const booking = await apiPost<{ id: string }>("/bookings/flights", { userId: getCurrentUserId(), offer });
      router.push(`/checkout?bookingId=${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start booking");
      setSelectingId(null);
    }
  }

  async function selectEmptyLeg(listing: EmptyLegListing) {
    setSelectingId(listing.id);
    try {
      const booking = await apiPost<{ id: string }>("/bookings/empty-legs", { userId: getCurrentUserId(), listing });
      router.push(`/checkout?bookingId=${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start booking");
      setSelectingId(null);
    }
  }

  const loading = type === "flight" ? flights === null : emptyLegs === null;

  return (
    <PageShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-charcoal">
            {type === "flight" ? "Available Fares" : "Available Empty Legs"}
          </h1>
          <p className="mt-1 text-sm text-charcoal/55">
            {searchParams.get("origin")} &rarr; {searchParams.get("destination")}
          </p>
        </div>
        <a href="/" className="text-sm text-azure underline underline-offset-4">
          &larr; New search
        </a>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-azure/25 bg-panel px-4 py-3 text-sm text-charcoal shadow-sm">{error}</div>
      )}

      {loading && !error && <p className="text-charcoal/50">Searching…</p>}

      {type === "flight" && flights && (
        <div className="flex flex-col gap-4">
          {flights.length === 0 && <EmptyState />}
          {flights.map((offer) => (
            <FlightRow key={offer.id} offer={offer} onSelect={() => selectFlight(offer)} selecting={selectingId === offer.id} />
          ))}
        </div>
      )}

      {type === "empty_leg" && emptyLegs && (
        <div className="flex flex-col gap-4">
          {emptyLegs.length === 0 && <EmptyState />}
          {emptyLegs.map((listing) => (
            <EmptyLegRow
              key={listing.id}
              listing={listing}
              onSelect={() => selectEmptyLeg(listing)}
              selecting={selectingId === listing.id}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function FlightRow({ offer, onSelect, selecting }: { offer: FlightOffer; onSelect: () => void; selecting: boolean }) {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];

  return (
    <div className="flex items-center gap-6 rounded-xl border border-charcoal/10 bg-panel p-6 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-azure/40 font-display text-sm font-semibold text-azure">
        {offer.airline.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1">
        <p className="font-medium text-charcoal">{offer.airline}</p>
        <p className="text-sm text-charcoal/55">
          {first.origin} &rarr; {last.destination} &middot; {Math.round(first.durationMinutes / 60)}h {first.durationMinutes % 60}m
        </p>
      </div>
      <span className="rounded-full bg-azure-light px-3 py-1 text-xs font-medium capitalize text-azure">{offer.cabinClass}</span>
      <p className="font-display text-2xl font-semibold text-charcoal">
        {offer.amount.toLocaleString(undefined, { style: "currency", currency: offer.currency, maximumFractionDigits: 0 })}
      </p>
      <button
        type="button"
        onClick={onSelect}
        disabled={selecting}
        className="rounded-lg bg-azure px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {selecting ? "Selecting…" : "Select"}
      </button>
    </div>
  );
}

function EmptyLegRow({
  listing,
  onSelect,
  selecting,
}: {
  listing: EmptyLegListing;
  onSelect: () => void;
  selecting: boolean;
}) {
  return (
    <div className="flex items-center gap-6 rounded-xl border border-charcoal/10 bg-panel p-6 shadow-sm">
      <div className="flex-1">
        <p className="font-medium text-charcoal">
          {listing.aircraftType} &middot; {listing.operatorName}
        </p>
        <p className="text-sm text-charcoal/55">
          {listing.origin} &rarr; {listing.destination}
        </p>
      </div>
      <p className="font-display text-2xl font-semibold text-charcoal">
        {listing.amount.toLocaleString(undefined, { style: "currency", currency: listing.currency, maximumFractionDigits: 0 })}
      </p>
      <button
        type="button"
        onClick={onSelect}
        disabled={selecting}
        className="rounded-lg bg-azure px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {selecting ? "Selecting…" : "Select"}
      </button>
    </div>
  );
}

function EmptyState() {
  return <p className="rounded-xl border border-dashed border-charcoal/15 p-10 text-center text-charcoal/50">No results for this search.</p>;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">{children}</main>;
}

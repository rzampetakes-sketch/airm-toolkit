"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet } from "../../lib/api";

interface HotelOffer {
  id: string;
  name: string;
  roomType: string;
  location: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  currency: string;
}

export default function HotelsSearchPage() {
  return (
    <Suspense fallback={<PageShell>Loading…</PageShell>}>
      <HotelsContent />
    </Suspense>
  );
}

function HotelsContent() {
  const searchParams = useSearchParams();
  const [location, setLocation] = useState(searchParams.get("location") ?? "New York");
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") ?? "2026-10-14");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") ?? "2026-10-17");
  const [guests, setGuests] = useState(Number(searchParams.get("guests") ?? 1));
  const [results, setResults] = useState<HotelOffer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const offers = await apiGet<HotelOffer[]>(
        `/hotels/search?location=${encodeURIComponent(location)}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}`,
      );
      setResults(offers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search hotels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("location")) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell>
      <Link href="/" className="text-sm text-azure underline underline-offset-4">
        &larr; Back home
      </Link>

      <div className="mt-6 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-azure">Hotels</p>
        <h1 className="font-display text-4xl font-semibold text-charcoal">Search Hotels</h1>
      </div>

      <form onSubmit={search} className="mx-auto mt-8 rounded-2xl border border-charcoal/10 bg-panel p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Location">
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" />
          </Field>
          <Field label="Guests">
            <input type="number" min={1} max={9} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="input" />
          </Field>
          <Field label="Check-in">
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="input" />
          </Field>
          <Field label="Check-out">
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="input" />
          </Field>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full rounded-lg bg-azure py-4 font-display text-lg font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search Hotels"}
        </button>
      </form>

      {error && <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-red-600">{error}</p>}

      {results && (
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4">
          {results.length === 0 && <EmptyState />}
          {results.map((hotel) => (
            <div key={hotel.id} className="flex items-center gap-6 rounded-xl border border-charcoal/10 bg-panel p-6 shadow-sm">
              <div className="flex-1">
                <p className="font-medium text-charcoal">{hotel.name}</p>
                <p className="text-sm text-charcoal/55">
                  {hotel.roomType} &middot; {hotel.location}
                </p>
              </div>
              <p className="font-display text-2xl font-semibold text-charcoal">
                {hotel.amount.toLocaleString(undefined, { style: "currency", currency: hotel.currency, maximumFractionDigits: 0 })}
              </p>
              <p className="max-w-[160px] text-right text-xs text-charcoal/50">Add this during checkout on your next flight or jet booking</p>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function EmptyState() {
  return <p className="rounded-xl border border-dashed border-charcoal/15 p-10 text-center text-charcoal/50">No hotels found for this search.</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wide text-charcoal/50">{label}</span>
      {children}
    </label>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">{children}</main>;
}

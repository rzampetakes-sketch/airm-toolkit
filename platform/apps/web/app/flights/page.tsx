"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CabinClass } from "@travel-platform/types";

export default function FlightsSearchPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LHR");
  const [departureDate, setDepartureDate] = useState("2026-10-14");
  const [cabinClass, setCabinClass] = useState<CabinClass>("business");
  const [passengers, setPassengers] = useState(1);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      type: "flight",
      origin,
      destination,
      departureDate,
      cabinClass,
      passengers: String(passengers),
    });
    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-gold underline underline-offset-4">
        &larr; Back home
      </Link>

      <div className="mt-6 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-gold">Commercial Flights</p>
        <h1 className="font-display text-4xl font-semibold text-cream">Search Business &amp; First Class</h1>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 rounded-2xl border border-gold/25 bg-panel p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="From">
            <input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} className="input" maxLength={3} />
          </Field>
          <Field label="To">
            <input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} className="input" maxLength={3} />
          </Field>
          <Field label="Departure date">
            <input type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className="input" />
          </Field>
          <Field label="Passengers">
            <input type="number" min={1} max={9} value={passengers} onChange={(e) => setPassengers(Number(e.target.value))} className="input" />
          </Field>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-cream/50">Cabin</p>
          <div className="flex gap-2">
            {(["business", "first"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCabinClass(option)}
                className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition ${
                  cabinClass === option ? "bg-gold text-ink" : "border border-cream/20 text-cream/60"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="mt-8 w-full rounded-lg bg-burgundy py-4 font-display text-lg font-semibold text-cream shadow-sm transition hover:bg-burgundy-dark"
        >
          Search Flights
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wide text-cream/50">{label}</span>
      {children}
    </label>
  );
}

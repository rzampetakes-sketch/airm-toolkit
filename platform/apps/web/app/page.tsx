"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CabinClass } from "@travel-platform/types";

type SearchMode = "flight" | "empty_leg";

export default function HomePage() {
  const router = useRouter();
  const [mode, setMode] = useState<SearchMode>("flight");

  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LHR");
  const [departureDate, setDepartureDate] = useState("2026-10-14");
  const [cabinClass, setCabinClass] = useState<CabinClass>("business");
  const [passengers, setPassengers] = useState(1);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const params =
      mode === "flight"
        ? new URLSearchParams({ type: "flight", origin, destination, departureDate, cabinClass, passengers: String(passengers) })
        : new URLSearchParams({
            type: "empty_leg",
            origin,
            destination,
            earliestDeparture: new Date(departureDate).toISOString(),
            latestDeparture: new Date(new Date(departureDate).getTime() + 14 * 24 * 3_600_000).toISOString(),
          });

    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pb-24">
      <header className="flex items-center justify-between py-10">
        <div className="font-display text-2xl font-semibold tracking-wide text-burgundy">Aeros</div>
        <nav className="text-sm text-ink/60">Sign in</nav>
      </header>

      <section className="flex flex-col items-center pt-10 text-center">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.25em] text-gold">Business &middot; First &middot; Private Jet</p>
        <h1 className="font-display text-5xl font-semibold leading-tight text-burgundy md:text-6xl">
          Where journeys become occasions.
        </h1>
        <p className="mt-5 max-w-xl text-ink/65">
          Business and First class fares, and discounted private jet empty legs, curated for travelers who notice the details.
        </p>
      </section>

      <div className="mt-10 flex justify-center">
        <div className="inline-flex rounded-full border border-gold/30 bg-cream-deep p-1">
          <button
            type="button"
            onClick={() => setMode("flight")}
            className={`rounded-full px-6 py-2 text-sm font-medium transition ${
              mode === "flight" ? "bg-burgundy text-cream" : "text-ink/60"
            }`}
          >
            Flights
          </button>
          <button
            type="button"
            onClick={() => setMode("empty_leg")}
            className={`rounded-full px-6 py-2 text-sm font-medium transition ${
              mode === "empty_leg" ? "bg-burgundy text-cream" : "text-ink/60"
            }`}
          >
            Empty Legs
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-8 max-w-3xl rounded-2xl border border-gold/25 bg-cream-deep p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="From">
            <input
              value={origin}
              onChange={(event) => setOrigin(event.target.value.toUpperCase())}
              placeholder="JFK"
              className="input"
              maxLength={3}
            />
          </Field>
          <Field label="To">
            <input
              value={destination}
              onChange={(event) => setDestination(event.target.value.toUpperCase())}
              placeholder="LHR"
              className="input"
              maxLength={3}
            />
          </Field>
          <Field label={mode === "flight" ? "Departure date" : "Earliest departure"}>
            <input
              type="date"
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
              className="input"
            />
          </Field>

          {mode === "flight" ? (
            <Field label="Passengers">
              <input
                type="number"
                min={1}
                max={9}
                value={passengers}
                onChange={(event) => setPassengers(Number(event.target.value))}
                className="input"
              />
            </Field>
          ) : (
            <div />
          )}
        </div>

        {mode === "flight" && (
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-ink/50">Cabin</p>
            <div className="flex gap-2">
              {(["business", "first"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCabinClass(option)}
                  className={`rounded-full px-5 py-2 text-sm font-medium capitalize transition ${
                    cabinClass === option ? "bg-gold text-ink" : "border border-ink/15 text-ink/60"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          className="mt-8 w-full rounded-lg bg-burgundy py-4 font-display text-lg font-semibold text-cream shadow-sm transition hover:bg-burgundy-dark"
        >
          {mode === "flight" ? "Search Flights" : "Search Empty Legs"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wide text-ink/50">{label}</span>
      {children}
    </label>
  );
}

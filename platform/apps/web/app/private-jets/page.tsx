"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrivateJetsSearchPage() {
  const router = useRouter();
  const [origin, setOrigin] = useState("TEB");
  const [destination, setDestination] = useState("PBI");
  const [earliestDate, setEarliestDate] = useState("2026-10-14");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      type: "empty_leg",
      origin,
      destination,
      earliestDeparture: new Date(earliestDate).toISOString(),
      latestDeparture: new Date(new Date(earliestDate).getTime() + 14 * 24 * 3_600_000).toISOString(),
    });
    router.push(`/results?${params.toString()}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <Link href="/" className="text-sm text-gold underline underline-offset-4">
        &larr; Back home
      </Link>

      <div className="mt-6 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-gold">Business Jets</p>
        <h1 className="font-display text-4xl font-semibold text-cream">Search Empty-Leg Charters</h1>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 rounded-2xl border border-gold/25 bg-panel p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="From">
            <input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} className="input" maxLength={3} />
          </Field>
          <Field label="To">
            <input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} className="input" maxLength={3} />
          </Field>
          <Field label="Earliest departure">
            <input type="date" value={earliestDate} onChange={(e) => setEarliestDate(e.target.value)} className="input" />
          </Field>
        </div>

        <button
          type="submit"
          className="mt-8 w-full rounded-lg bg-burgundy py-4 font-display text-lg font-semibold text-cream shadow-sm transition hover:bg-burgundy-dark"
        >
          Search Business Jets
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

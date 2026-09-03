"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Tab = "flights" | "hotels" | "car-rentals" | "jets";

const TABS: { id: Tab; label: string }[] = [
  { id: "flights", label: "Flights" },
  { id: "hotels", label: "Hotels" },
  { id: "car-rentals", label: "Car Rentals" },
  { id: "jets", label: "Business Jets" },
];

export function HomeSearchTabs() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("flights");

  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LHR");
  const [date, setDate] = useState("2026-10-14");
  const [location, setLocation] = useState("New York");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (tab === "flights") {
      router.push(
        `/results?${new URLSearchParams({ type: "flight", origin, destination, departureDate: date, cabinClass: "business", passengers: "1" })}`,
      );
    } else if (tab === "jets") {
      router.push(
        `/results?${new URLSearchParams({
          type: "empty_leg",
          origin,
          destination,
          earliestDeparture: new Date(date).toISOString(),
          latestDeparture: new Date(new Date(date).getTime() + 14 * 24 * 3_600_000).toISOString(),
        })}`,
      );
    } else if (tab === "hotels") {
      const checkOut = new Date(new Date(date).getTime() + 3 * 24 * 3_600_000).toISOString().slice(0, 10);
      router.push(`/hotels?${new URLSearchParams({ location, checkIn: date, checkOut, guests: "1" })}`);
    } else {
      router.push(`/car-rentals?${new URLSearchParams({ pickupLocation: location, dropoffLocation: location, pickupAt: date, dropoffAt: date })}`);
    }
  }

  const usesAirportCodes = tab === "flights" || tab === "jets";

  return (
    <div className="relative mx-auto max-w-3xl rounded-2xl bg-white/95 p-6 text-left shadow-2xl backdrop-blur">
      <div className="flex gap-1 border-b border-charcoal/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-azure text-white" : "text-charcoal/60 hover:bg-azure-light"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
        {usesAirportCodes ? (
          <>
            <Field label="From">
              <input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} className="input" maxLength={3} />
            </Field>
            <Field label="To">
              <input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} className="input" maxLength={3} />
            </Field>
          </>
        ) : (
          <Field label={tab === "hotels" ? "Location" : "Pickup & drop-off"}>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="input" />
          </Field>
        )}
        <Field label={tab === "flights" ? "Departure" : tab === "jets" ? "Earliest departure" : tab === "hotels" ? "Check-in" : "Pickup date"}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </Field>
        <button
          type="submit"
          className="self-end rounded-lg bg-azure px-6 py-3 font-display text-base font-semibold text-white transition hover:opacity-90"
        >
          Search
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wide text-charcoal/50">{label}</span>
      {children}
    </label>
  );
}

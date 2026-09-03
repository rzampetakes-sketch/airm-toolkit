"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AirplaneWindow } from "./AirplaneWindow";

type Mode = "commercial" | "private";

/**
 * Two horizontal "slides" in an overflow-hidden track: the window choice,
 * then a minimal search form for whichever mode was picked. Moving
 * between them is a real CSS transform transition, not a page
 * navigation — only submitting the form navigates (to /results).
 */
export function TravelModeFlow() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [origin, setOrigin] = useState("JFK");
  const [destination, setDestination] = useState("LHR");
  const [date, setDate] = useState("2026-10-14");

  const onSearchSlide = mode !== null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "commercial") {
      router.push(
        `/results?${new URLSearchParams({ type: "flight", origin, destination, departureDate: date, cabinClass: "business", passengers: "1" })}`,
      );
    } else if (mode === "private") {
      router.push(
        `/results?${new URLSearchParams({
          type: "empty_leg",
          origin,
          destination,
          earliestDeparture: new Date(date).toISOString(),
          latestDeparture: new Date(new Date(date).getTime() + 14 * 24 * 3_600_000).toISOString(),
        })}`,
      );
    }
  }

  return (
    <div className="relative mx-auto max-w-5xl overflow-hidden px-6 pb-20 pt-6">
      <div
        className="flex w-[200%] transition-transform duration-500 ease-in-out"
        style={{ transform: onSearchSlide ? "translateX(-50%)" : "translateX(0%)" }}
      >
        <div className="w-1/2 shrink-0 px-1" aria-hidden={onSearchSlide} inert={onSearchSlide || undefined}>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
            <AirplaneWindow
              variant="day"
              eyebrow="Commercial Flights"
              title="Fly Commercial"
              lines={["Global destinations", "Business & First class fares"]}
              cta="Search Commercial Flights"
              onSelect={() => setMode("commercial")}
            />
            <AirplaneWindow
              variant="night"
              eyebrow="Business Jets"
              title="Fly Private"
              lines={["Ultimate flexibility", "Empty legs at up to 75% off"]}
              cta="Search Business Jets"
              onSelect={() => setMode("private")}
            />
          </div>
        </div>

        <div className="w-1/2 shrink-0 px-1" aria-hidden={!onSearchSlide} inert={!onSearchSlide || undefined}>
          <div className="mx-auto max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="mb-4 text-sm text-azure underline underline-offset-4"
            >
              &larr; Back
            </button>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-azure">
              {mode === "commercial" ? "Commercial Flights" : "Business Jets"}
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="From">
                  <input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} className="input" maxLength={3} />
                </Field>
                <Field label="To">
                  <input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} className="input" maxLength={3} />
                </Field>
              </div>
              <Field label={mode === "commercial" ? "Departure" : "Earliest departure"}>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
              </Field>
              <button
                type="submit"
                className="mt-2 rounded-lg bg-azure py-3 font-display text-lg font-semibold text-white transition hover:opacity-90"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </div>
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

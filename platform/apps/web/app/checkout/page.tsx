"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, ApiError } from "../../lib/api";

interface SeatSelection {
  id: string;
  seatNumber: string;
  priceAdjustment: string;
}
interface BaggageSelection {
  id: string;
  bagType: "checked" | "carry_on";
  quantity: number;
  priceAdjustment: string;
}
interface Passenger {
  id: string;
  firstName: string;
  lastName: string;
  seatSelections: SeatSelection[];
  baggageSelections: BaggageSelection[];
}
interface FlightSegment {
  id: string;
  origin: string;
  destination: string;
}
interface BookingDetail {
  id: string;
  bookingType: "flight" | "empty_leg";
  status: string;
  totalAmount: string;
  currency: string;
  flight: { airline: string; cabinClass: string; amount: string; segments: FlightSegment[] } | null;
  emptyLeg: { operatorName: string; aircraftType: string; origin: string; destination: string; amount: string } | null;
  passengers: Passenger[];
}

const SEAT_ROWS = [1, 2, 3, 4];
const SEAT_LETTERS = ["A", "C", "D", "F"];

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageShell>Loading…</PageShell>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const bookingId = useSearchParams().get("bookingId");
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const [firstName, setFirstName] = useState("Alexandra");
  const [lastName, setLastName] = useState("Reyes");
  const [dateOfBirth, setDateOfBirth] = useState("1986-04-12");

  const refetch = useCallback(() => {
    if (!bookingId) return;
    apiGet<BookingDetail>(`/bookings/${bookingId}`)
      .then(setBooking)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load booking"));
  }, [bookingId]);

  useEffect(refetch, [refetch]);

  if (!bookingId) return <PageShell>No booking selected — start a new search.</PageShell>;
  if (error && !booking) return <PageShell>{error}</PageShell>;
  if (!booking) return <PageShell>Loading…</PageShell>;

  const passenger = booking.passengers[0];
  const segment = booking.flight?.segments[0];
  const seat = passenger?.seatSelections[0];
  const checkedBags = passenger?.baggageSelections.filter((b) => b.bagType === "checked") ?? [];
  const checkedBagCount = checkedBags.reduce((sum, b) => sum + b.quantity, 0);

  async function addPassenger() {
    try {
      await apiPost(`/bookings/${bookingId}/passengers`, { firstName, lastName, dateOfBirth });
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add traveler");
    }
  }

  async function selectSeat(seatNumber: string) {
    if (!passenger || !segment) return;
    try {
      await apiPost(`/bookings/${bookingId}/seats`, { passengerId: passenger.id, flightSegmentId: segment.id, seatNumber });
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not select seat");
    }
  }

  async function addCheckedBag() {
    if (!passenger) return;
    try {
      await apiPost(`/bookings/${bookingId}/baggage`, { passengerId: passenger.id, bagType: "checked", quantity: 1 });
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add baggage");
    }
  }

  async function completeCheckout() {
    setPaying(true);
    setError(null);
    try {
      await apiPost(`/bookings/${bookingId}/checkout`);
      setPaid(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Payment could not be processed — this environment has no live Stripe key configured.",
      );
      refetch();
    } finally {
      setPaying(false);
    }
  }

  if (paid) {
    return (
      <PageShell>
        <div className="mx-auto max-w-lg rounded-2xl border border-gold/30 bg-panel p-10 text-center">
          <p className="font-display text-3xl font-semibold text-cream">Booking Confirmed</p>
          <p className="mt-3 text-cream/60">Confirmation reference {booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="font-display text-3xl font-semibold text-cream">Complete Your Booking</h1>
            <p className="mt-1 text-sm text-cream/55">
              {booking.flight
                ? `${booking.flight.airline} · ${segment?.origin} → ${segment?.destination} · ${booking.flight.cabinClass}`
                : `${booking.emptyLeg?.operatorName} · ${booking.emptyLeg?.aircraftType} · ${booking.emptyLeg?.origin} → ${booking.emptyLeg?.destination}`}
            </p>
          </div>

          {error && <div className="rounded-lg border border-gold/30 bg-panel px-4 py-3 text-sm text-cream">{error}</div>}

          <Section title="Traveler">
            {passenger ? (
              <p className="text-cream/80">
                {passenger.firstName} {passenger.lastName}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <LabeledInput label="First name" value={firstName} onChange={setFirstName} />
                  <LabeledInput label="Last name" value={lastName} onChange={setLastName} />
                </div>
                <LabeledInput label="Date of birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
                <button
                  type="button"
                  onClick={addPassenger}
                  className="self-start rounded-lg bg-burgundy px-6 py-3 text-sm font-medium text-cream transition hover:bg-burgundy-dark"
                >
                  Save Traveler
                </button>
              </div>
            )}
          </Section>

          {passenger && booking.flight && (
            <>
              <Section title="Select Seat">
                {seat ? (
                  <p className="text-cream/80">Seat {seat.seatNumber} selected {Number(seat.priceAdjustment) > 0 && `(+$${seat.priceAdjustment})`}</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {SEAT_ROWS.map((row) => (
                      <div key={row} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-cream/40">{row}</span>
                        {SEAT_LETTERS.map((letter) => (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => selectSeat(`${row}${letter}`)}
                            className="h-9 w-9 rounded-md border border-cream/20 text-xs text-cream/60 transition hover:border-gold hover:text-gold"
                          >
                            {row}
                            {letter}
                          </button>
                        ))}
                      </div>
                    ))}
                    <p className="mt-1 text-xs text-cream/40">Rows 1–5 carry a $150 preferred-seating fee.</p>
                  </div>
                )}
              </Section>

              <Section title="Baggage">
                <div className="flex items-center justify-between">
                  <p className="text-cream/70">Checked bags &middot; $120 each</p>
                  <div className="flex items-center gap-4">
                    <span className="text-cream/80">{checkedBagCount}</span>
                    <button
                      type="button"
                      onClick={addCheckedBag}
                      className="rounded-full border border-gold/40 px-3 py-1 text-sm text-gold transition hover:bg-gold/10"
                    >
                      + Add bag
                    </button>
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-gold/30 bg-panel p-7">
          <p className="mb-5 text-xs uppercase tracking-wide text-cream/50">Order Summary</p>

          <SummaryLine label={booking.flight ? "Fare" : "Charter fare"} amount={booking.flight?.amount ?? booking.emptyLeg?.amount ?? "0"} />
          {passenger?.seatSelections.map((s) => (
            <SummaryLine key={s.id} label={`Seat ${s.seatNumber}`} amount={s.priceAdjustment} prefix="+" />
          ))}
          {checkedBags.map((b) => (
            <SummaryLine key={b.id} label={`Checked bag ×${b.quantity}`} amount={b.priceAdjustment} prefix="+" />
          ))}

          <div className="my-4 h-px bg-cream/10" />

          <div className="mb-6 flex justify-between font-display text-2xl font-semibold text-cream">
            <span>Total</span>
            <span>{Number(booking.totalAmount).toLocaleString(undefined, { style: "currency", currency: booking.currency, maximumFractionDigits: 0 })}</span>
          </div>

          <button
            type="button"
            onClick={completeCheckout}
            disabled={!passenger || paying}
            className="w-full rounded-lg bg-burgundy py-4 font-display text-lg font-semibold text-cream transition hover:bg-burgundy-dark disabled:opacity-40"
          >
            {paying ? "Processing…" : "Complete Payment"}
          </button>
        </aside>
      </div>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gold/20 bg-panel/60 p-6">
      <p className="mb-4 text-xs uppercase tracking-wide text-gold">{title}</p>
      {children}
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-wide text-cream/50">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="input" />
    </label>
  );
}

function SummaryLine({ label, amount, prefix = "" }: { label: string; amount: string; prefix?: string }) {
  return (
    <div className="mb-2 flex justify-between text-sm text-cream/70">
      <span>{label}</span>
      <span>
        {prefix}${Number(amount).toLocaleString()}
      </span>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">{children}</main>;
}

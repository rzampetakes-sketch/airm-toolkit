import { FlightOffer } from "@travel-platform/types";

export function FlightOfferCard({ offer }: { offer: FlightOffer }) {
  const [first, last] = [offer.segments[0], offer.segments[offer.segments.length - 1]];

  return (
    <div className="rounded-lg border border-gold/25 bg-cream-deep p-6 text-ink">
      <span className="text-xs uppercase tracking-wide text-gold">
        {offer.cabinClass === "first" ? "First Class" : "Business Class"}
      </span>
      <h3 className="mt-2 font-display text-xl text-burgundy">
        {first?.origin} → {last?.destination}
      </h3>
      <p className="text-sm text-ink/60">{offer.airline}</p>
      <p className="mt-4 font-display text-2xl font-semibold text-burgundy">
        {offer.amount.toLocaleString(undefined, { style: "currency", currency: offer.currency })}
      </p>
    </div>
  );
}

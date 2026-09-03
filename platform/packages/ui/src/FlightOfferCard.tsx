import { FlightOffer } from "@travel-platform/types";

export function FlightOfferCard({ offer }: { offer: FlightOffer }) {
  const [first, last] = [offer.segments[0], offer.segments[offer.segments.length - 1]];

  return (
    <div className="rounded-lg border border-charcoal/10 bg-panel p-6 text-charcoal shadow-sm">
      <span className="text-xs uppercase tracking-wide text-azure">
        {offer.cabinClass === "first" ? "First Class" : "Business Class"}
      </span>
      <h3 className="mt-2 font-display text-xl text-charcoal">
        {first?.origin} → {last?.destination}
      </h3>
      <p className="text-sm text-charcoal/60">{offer.airline}</p>
      <p className="mt-4 font-display text-2xl font-semibold text-charcoal">
        {offer.amount.toLocaleString(undefined, { style: "currency", currency: offer.currency })}
      </p>
    </div>
  );
}

import { FlightOffer } from "@travel-platform/types";

export function FlightOfferCard({ offer }: { offer: FlightOffer }) {
  const [first, last] = [offer.segments[0], offer.segments[offer.segments.length - 1]];

  return (
    <div className="rounded-lg border border-teal/25 bg-panel p-6 text-white">
      <span className="text-xs uppercase tracking-wide text-teal">
        {offer.cabinClass === "first" ? "First Class" : "Business Class"}
      </span>
      <h3 className="mt-2 font-display text-xl">
        {first?.origin} → {last?.destination}
      </h3>
      <p className="text-sm text-white/60">{offer.airline}</p>
      <p className="mt-4 text-2xl font-display text-orange">
        {offer.amount.toLocaleString(undefined, { style: "currency", currency: offer.currency })}
      </p>
    </div>
  );
}

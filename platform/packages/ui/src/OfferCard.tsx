import { UnifiedFlightOffer } from "@travel-platform/types";

const OFFER_TYPE_LABEL: Record<UnifiedFlightOffer["type"], string> = {
  commercial_flight: "Business/First",
  private_jet_charter: "Private Jet",
  empty_leg: "Empty Leg",
};

export function OfferCard({ offer }: { offer: UnifiedFlightOffer }) {
  const [first, last] = [offer.segments[0], offer.segments[offer.segments.length - 1]];

  return (
    <div className="rounded-lg border border-gold/30 bg-charcoal p-6 text-white">
      <span className="text-xs uppercase tracking-wide text-gold">
        {OFFER_TYPE_LABEL[offer.type]}
      </span>
      <h3 className="mt-2 font-display text-xl">
        {first?.origin} → {last?.destination}
      </h3>
      {offer.operatorName && <p className="text-sm text-white/60">{offer.operatorName}</p>}
      <p className="mt-4 text-2xl text-gold">
        {offer.finalAmount.toLocaleString(undefined, { style: "currency", currency: offer.finalCurrency })}
      </p>
    </div>
  );
}

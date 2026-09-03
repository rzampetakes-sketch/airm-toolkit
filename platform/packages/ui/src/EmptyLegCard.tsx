import { EmptyLegListing } from "@travel-platform/types";

export function EmptyLegCard({ listing }: { listing: EmptyLegListing }) {
  return (
    <div className="rounded-lg border border-gold/25 bg-panel p-6 text-cream">
      <span className="text-xs uppercase tracking-wide text-gold">Empty Leg</span>
      <h3 className="mt-2 font-display text-xl text-cream">
        {listing.origin} → {listing.destination}
      </h3>
      <p className="text-sm text-cream/60">
        {listing.aircraftType} · {listing.operatorName}
      </p>
      <p className="mt-4 font-display text-2xl font-semibold text-cream">
        {listing.amount.toLocaleString(undefined, { style: "currency", currency: listing.currency })}
      </p>
    </div>
  );
}

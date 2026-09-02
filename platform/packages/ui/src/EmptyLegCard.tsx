import { EmptyLegListing } from "@travel-platform/types";

export function EmptyLegCard({ listing }: { listing: EmptyLegListing }) {
  return (
    <div className="rounded-lg border border-gold/25 bg-cream-deep p-6 text-ink">
      <span className="text-xs uppercase tracking-wide text-gold">Empty Leg</span>
      <h3 className="mt-2 font-display text-xl text-burgundy">
        {listing.origin} → {listing.destination}
      </h3>
      <p className="text-sm text-ink/60">
        {listing.aircraftType} · {listing.operatorName}
      </p>
      <p className="mt-4 font-display text-2xl font-semibold text-burgundy">
        {listing.amount.toLocaleString(undefined, { style: "currency", currency: listing.currency })}
      </p>
    </div>
  );
}

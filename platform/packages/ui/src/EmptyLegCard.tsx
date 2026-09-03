import { EmptyLegListing } from "@travel-platform/types";

export function EmptyLegCard({ listing }: { listing: EmptyLegListing }) {
  return (
    <div className="rounded-lg border border-charcoal/10 bg-panel p-6 text-charcoal shadow-sm">
      <span className="text-xs uppercase tracking-wide text-azure">Empty Leg</span>
      <h3 className="mt-2 font-display text-xl text-charcoal">
        {listing.origin} → {listing.destination}
      </h3>
      <p className="text-sm text-charcoal/60">
        {listing.aircraftType} · {listing.operatorName}
      </p>
      <p className="mt-4 font-display text-2xl font-semibold text-charcoal">
        {listing.amount.toLocaleString(undefined, { style: "currency", currency: listing.currency })}
      </p>
    </div>
  );
}

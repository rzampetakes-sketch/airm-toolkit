import { EmptyLegListing } from "@travel-platform/types";

export function EmptyLegCard({ listing }: { listing: EmptyLegListing }) {
  return (
    <div className="rounded-lg border border-gold/30 bg-charcoal p-6 text-white">
      <span className="text-xs uppercase tracking-wide text-gold">Empty Leg</span>
      <h3 className="mt-2 font-display text-xl">
        {listing.origin} → {listing.destination}
      </h3>
      <p className="text-sm text-white/60">
        {listing.aircraftType} · {listing.operatorName}
      </p>
      <p className="mt-4 text-2xl text-gold">
        {listing.amount.toLocaleString(undefined, { style: "currency", currency: listing.currency })}
      </p>
    </div>
  );
}

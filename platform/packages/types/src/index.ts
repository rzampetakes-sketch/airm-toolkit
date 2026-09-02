export type OfferSource = "duffel" | "amadeus" | "sabre" | "avinode" | "empty_leg";

export type OfferType = "commercial_flight" | "private_jet_charter" | "empty_leg";

export type CabinClass = "business" | "first" | "private";

export interface OfferSegment {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  flightNumber?: string;
  durationMinutes: number;
}

export interface AppliedMarkup {
  ruleId: string;
  type: "percentage" | "fixed";
  value: number;
  amount: number;
}

/**
 * The normalized shape every integration adapter (Duffel, Amadeus, Sabre,
 * Avinode, empty-leg feeds) maps its vendor response into. Search ranking,
 * the pricing engine, and the frontend only ever deal with this type —
 * never a vendor-specific payload.
 */
export interface UnifiedFlightOffer {
  id: string;
  source: OfferSource;
  sourceOfferId: string;
  type: OfferType;
  cabinClass?: CabinClass;
  aircraftType?: string;
  operatorName?: string;
  segments: OfferSegment[];
  baseAmount: number;
  baseCurrency: string;
  markup?: AppliedMarkup;
  finalAmount: number;
  finalCurrency: string;
  seatsAvailable?: number;
  expiresAt: string;
}

export type MarkupScopeType =
  | "route"
  | "aircraft_type"
  | "cabin_class"
  | "customer_segment"
  | "global";

export type MarkupType = "percentage" | "fixed";

export interface MarkupRule {
  id: string;
  name: string;
  scopeType: MarkupScopeType;
  scopeValue: Record<string, string>;
  markupType: MarkupType;
  markupValue: number;
  priority: number;
  active: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface PricingContext {
  route: { origin: string; destination: string };
  aircraftType?: string;
  cabinClass?: CabinClass;
  customerSegment?: string;
}

export type LoyaltyEntryType = "earn" | "redeem" | "adjust" | "expire";

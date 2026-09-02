// ---- Part 1: Business/First class flight search ----

export type FlightProviderSource = "duffel" | "amadeus" | "sabre" | "travelport" | "mock";

export type CabinClass = "business" | "first";

export interface FlightSegment {
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  airline: string;
  flightNumber: string;
  durationMinutes: number;
}

/**
 * The normalized shape every commercial-fare provider (Duffel, Amadeus,
 * Sabre, Travelport, or the mock provider) maps its response into.
 * Ranking, the frontend, and the booking flow only ever deal with this
 * type — never a vendor-specific payload.
 */
export interface FlightOffer {
  id: string;
  source: FlightProviderSource;
  sourceOfferId: string;
  cabinClass: CabinClass;
  airline: string;
  segments: FlightSegment[];
  amount: number;
  currency: string;
  seatsAvailable?: number;
  expiresAt: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: CabinClass;
}

// ---- Part 2: Private jet empty-leg marketplace ----

export type EmptyLegProviderSource = "platform_listed" | "avinode" | "jettly" | "mock";

export type EmptyLegStatus = "available" | "booked" | "expired" | "cancelled";

/**
 * The normalized shape for an empty-leg listing, whether it was entered
 * directly by an Operator through the operator portal (`platform_listed`)
 * or pulled from an external aggregator (Avinode, Jettly, ...).
 */
export interface EmptyLegListing {
  id: string;
  source: EmptyLegProviderSource;
  sourceListingId?: string;
  operatorId?: string;
  operatorName: string;
  aircraftType: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  seatsAvailable: number;
  amount: number;
  currency: string;
  status: EmptyLegStatus;
}

export interface EmptyLegSearchParams {
  origin?: string;
  destination?: string;
  earliestDeparture: string;
  latestDeparture: string;
}

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

export type EmptyLegProviderSource = "platform_listed" | "avinode" | "jettly" | "jethunter" | "villiers" | "mock";

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

// ---- Frequent flyer / airline loyalty pass-through ----
//
// Not a platform-run points program — a saved (airline IATA code,
// membership number) pair per user, forwarded to the airline as part of
// the passenger record on booking so *the airline* credits miles. See
// docs/architecture/database-schema.md for why this was kept separate
// from the loyalty-ledger concept dropped earlier in this project.

export interface LoyaltyMembership {
  airlineIataCode: string;
  membershipNumber: string;
}

// ---- Checkout: passengers, seats, baggage ----

export interface PassengerInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber?: string;
  loyalty?: LoyaltyMembership;
}

export type BagType = "checked" | "carry_on";

export interface SeatOption {
  flightSegmentId: string;
  seatNumber: string;
  cabinClass: CabinClass;
  priceAdjustment: number;
  currency: string;
  available: boolean;
}

export interface BaggageOption {
  bagType: BagType;
  description: string;
  pricePerBag: number;
  currency: string;
  maxQuantity: number;
}

// ---- Add-ons: hotel, car rental, taxi ----

export type HotelProviderSource = "partner" | "mock";

export interface HotelOffer {
  id: string;
  source: HotelProviderSource;
  sourcePropertyId: string;
  name: string;
  roomType: string;
  location: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  currency: string;
}

export interface HotelSearchParams {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export type CarRentalProviderSource = "partner" | "mock";

export interface CarRentalOffer {
  id: string;
  source: CarRentalProviderSource;
  vehicleType: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupAt: string;
  dropoffAt: string;
  amount: number;
  currency: string;
}

export interface CarRentalSearchParams {
  pickupLocation: string;
  dropoffLocation: string;
  pickupAt: string;
  dropoffAt: string;
}

export type TaxiProviderSource = "partner" | "mock";

export interface TaxiOffer {
  id: string;
  source: TaxiProviderSource;
  vehicleType: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupAt: string;
  amount: number;
  currency: string;
}

export interface TaxiSearchParams {
  pickupLocation: string;
  dropoffLocation: string;
  pickupAt: string;
  passengers: number;
}

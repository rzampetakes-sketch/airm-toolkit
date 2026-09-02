import { FlightOffer, FlightProviderSource, FlightSearchParams } from "@travel-platform/types";

/**
 * Every commercial-fare source (Duffel, Amadeus, Sabre, Travelport, or
 * the mock provider used in development) implements this and returns
 * results already normalized to FlightOffer — FlightsService never sees
 * a vendor-specific payload. This is the seam you plug a real provider
 * into without touching search/ranking/booking logic.
 */
export interface FlightProvider {
  readonly source: FlightProviderSource;
  isEnabled(): boolean;
  search(params: FlightSearchParams): Promise<FlightOffer[]>;
}

export const FLIGHT_PROVIDERS = "FLIGHT_PROVIDERS";

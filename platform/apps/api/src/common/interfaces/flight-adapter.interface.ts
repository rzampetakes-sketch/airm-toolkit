import { UnifiedFlightOffer } from "@travel-platform/types";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
}

/**
 * Every commercial/charter/empty-leg source implements this and returns
 * results already normalized to UnifiedFlightOffer — the orchestrator
 * never sees a vendor-specific payload.
 */
export interface FlightSourceAdapter {
  readonly source: UnifiedFlightOffer["source"];
  search(params: FlightSearchParams): Promise<UnifiedFlightOffer[]>;
}

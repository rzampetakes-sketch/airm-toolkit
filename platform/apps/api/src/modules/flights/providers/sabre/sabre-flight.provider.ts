import { Injectable } from "@nestjs/common";
import { FlightOffer, FlightSearchParams } from "@travel-platform/types";
import { FlightProvider } from "../flight-provider.interface";

/**
 * Sabre's Bargain Finder Max API covers ATPCO, NDC, and LCC content and
 * can filter by cabin, but access requires activation by a Sabre account
 * representative — there is no instant self-serve signup like Duffel.
 * Budget for a commercial/onboarding conversation before counting on
 * this as a launch-day source. See
 * docs/architecture/api-provider-research.md for details.
 */
@Injectable()
export class SabreFlightProvider implements FlightProvider {
  readonly source = "sabre" as const;

  isEnabled(): boolean {
    return Boolean(process.env.SABRE_CLIENT_ID && process.env.SABRE_CLIENT_SECRET);
  }

  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    void params;
    return [];
  }
}

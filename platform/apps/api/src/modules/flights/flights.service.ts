import { Injectable } from "@nestjs/common";
import { FlightOffer, FlightSearchParams } from "@travel-platform/types";
import { DuffelFlightProvider } from "./providers/duffel/duffel-flight.provider";
import { AmadeusFlightProvider } from "./providers/amadeus/amadeus-flight.provider";
import { SabreFlightProvider } from "./providers/sabre/sabre-flight.provider";
import { MockFlightProvider } from "./providers/mock/mock-flight.provider";
import { FlightProvider } from "./providers/flight-provider.interface";

@Injectable()
export class FlightsService {
  private readonly providers: FlightProvider[];

  constructor(
    duffel: DuffelFlightProvider,
    amadeus: AmadeusFlightProvider,
    sabre: SabreFlightProvider,
    mock: MockFlightProvider,
  ) {
    this.providers = [duffel, amadeus, sabre, mock];
  }

  /**
   * Fans out to every *enabled* provider in parallel (a provider is
   * enabled when its required env vars are present — see each
   * provider's `isEnabled()`), normalizes to FlightOffer, and returns
   * one price-sorted list. Business/First only: `params.cabinClass` is
   * required and passed to each provider's own request, not filtered
   * after the fact.
   */
  async search(params: FlightSearchParams): Promise<FlightOffer[]> {
    const enabledProviders = this.providers.filter((provider) => provider.isEnabled());

    const resultsByProvider = await Promise.allSettled(
      enabledProviders.map((provider) => provider.search(params)),
    );

    const offers = resultsByProvider
      .filter((result): result is PromiseFulfilledResult<FlightOffer[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    return offers.sort((a, b) => a.amount - b.amount);
  }
}

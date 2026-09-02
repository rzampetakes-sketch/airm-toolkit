import { Injectable } from "@nestjs/common";
import { UnifiedFlightOffer } from "@travel-platform/types";
import { DuffelAdapter } from "../integrations/duffel/duffel.adapter";
import { AvinodeAdapter } from "../integrations/avinode/avinode.adapter";
import { FlightSearchParams, FlightSourceAdapter } from "../../common/interfaces/flight-adapter.interface";
import { PricingService } from "../pricing/pricing.service";

@Injectable()
export class SearchService {
  private readonly adapters: FlightSourceAdapter[];

  constructor(
    duffelAdapter: DuffelAdapter,
    avinodeAdapter: AvinodeAdapter,
    private readonly pricingService: PricingService,
  ) {
    this.adapters = [duffelAdapter, avinodeAdapter];
  }

  /**
   * Fans out to every source in parallel, normalizes results, prices
   * each offer through the markup engine, and returns one merged,
   * ranked list — commercial and private inventory interleaved.
   */
  async search(params: FlightSearchParams): Promise<UnifiedFlightOffer[]> {
    const resultsBySource = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.search(params)),
    );

    const offers = resultsBySource
      .filter((result): result is PromiseFulfilledResult<UnifiedFlightOffer[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const pricedOffers = await Promise.all(
      offers.map((offer) =>
        this.pricingService.applyMarkup(offer, {
          route: { origin: params.origin, destination: params.destination },
          aircraftType: offer.aircraftType,
          cabinClass: offer.cabinClass,
        }),
      ),
    );

    return pricedOffers.sort((a, b) => a.finalAmount - b.finalAmount);
  }
}

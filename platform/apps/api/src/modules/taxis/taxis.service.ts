import { Inject, Injectable } from "@nestjs/common";
import { TaxiOffer, TaxiSearchParams } from "@travel-platform/types";
import { TAXI_PROVIDERS, TaxiProvider } from "./providers/taxi-provider.interface";

@Injectable()
export class TaxisService {
  constructor(@Inject(TAXI_PROVIDERS) private readonly providers: TaxiProvider[]) {}

  async search(params: TaxiSearchParams): Promise<TaxiOffer[]> {
    const enabledProviders = this.providers.filter((provider) => provider.isEnabled());

    const resultsByProvider = await Promise.allSettled(
      enabledProviders.map((provider) => provider.search(params)),
    );

    return resultsByProvider
      .filter((result): result is PromiseFulfilledResult<TaxiOffer[]> => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .sort((a, b) => a.amount - b.amount);
  }
}

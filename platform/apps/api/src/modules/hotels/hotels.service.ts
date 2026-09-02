import { Inject, Injectable } from "@nestjs/common";
import { HotelOffer, HotelSearchParams } from "@travel-platform/types";
import { HOTEL_PROVIDERS, HotelProvider } from "./providers/hotel-provider.interface";

@Injectable()
export class HotelsService {
  constructor(@Inject(HOTEL_PROVIDERS) private readonly providers: HotelProvider[]) {}

  async search(params: HotelSearchParams): Promise<HotelOffer[]> {
    const enabledProviders = this.providers.filter((provider) => provider.isEnabled());

    const resultsByProvider = await Promise.allSettled(
      enabledProviders.map((provider) => provider.search(params)),
    );

    return resultsByProvider
      .filter((result): result is PromiseFulfilledResult<HotelOffer[]> => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .sort((a, b) => a.amount - b.amount);
  }
}

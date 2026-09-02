import { Inject, Injectable } from "@nestjs/common";
import { CarRentalOffer, CarRentalSearchParams } from "@travel-platform/types";
import { CAR_RENTAL_PROVIDERS, CarRentalProvider } from "./providers/car-rental-provider.interface";

@Injectable()
export class CarRentalsService {
  constructor(@Inject(CAR_RENTAL_PROVIDERS) private readonly providers: CarRentalProvider[]) {}

  async search(params: CarRentalSearchParams): Promise<CarRentalOffer[]> {
    const enabledProviders = this.providers.filter((provider) => provider.isEnabled());

    const resultsByProvider = await Promise.allSettled(
      enabledProviders.map((provider) => provider.search(params)),
    );

    return resultsByProvider
      .filter((result): result is PromiseFulfilledResult<CarRentalOffer[]> => result.status === "fulfilled")
      .flatMap((result) => result.value)
      .sort((a, b) => a.amount - b.amount);
  }
}

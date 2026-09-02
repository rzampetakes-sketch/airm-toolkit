import { CarRentalOffer, CarRentalSearchParams } from "@travel-platform/types";

export interface CarRentalProvider {
  readonly source: CarRentalOffer["source"];
  isEnabled(): boolean;
  search(params: CarRentalSearchParams): Promise<CarRentalOffer[]>;
}

/** DI token for the array of registered CarRentalProviders — see car-rentals.module.ts. */
export const CAR_RENTAL_PROVIDERS = "CAR_RENTAL_PROVIDERS";

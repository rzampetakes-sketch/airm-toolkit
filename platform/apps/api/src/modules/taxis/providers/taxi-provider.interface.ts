import { TaxiOffer, TaxiSearchParams } from "@travel-platform/types";

export interface TaxiProvider {
  readonly source: TaxiOffer["source"];
  isEnabled(): boolean;
  search(params: TaxiSearchParams): Promise<TaxiOffer[]>;
}

/** DI token for the array of registered TaxiProviders — see taxis.module.ts. */
export const TAXI_PROVIDERS = "TAXI_PROVIDERS";

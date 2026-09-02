import { HotelOffer, HotelSearchParams } from "@travel-platform/types";

/**
 * Same adapter pattern as flights/empty-legs: the checkout add-on flow
 * only ever talks to this interface, never to a vendor SDK directly.
 * `partner` is our contracted hotel inventory API (see
 * partner-hotel.provider.ts — the brief calls for "our own hotel partner
 * inventory/API", i.e. one contracted supplier, not a multi-vendor
 * aggregation like the empty-leg marketplace); `mock` is fixture data
 * for development before that contract/integration exists.
 */
export interface HotelProvider {
  readonly source: HotelOffer["source"];
  isEnabled(): boolean;
  search(params: HotelSearchParams): Promise<HotelOffer[]>;
}

/** DI token for the array of registered HotelProviders — see hotels.module.ts. */
export const HOTEL_PROVIDERS = "HOTEL_PROVIDERS";

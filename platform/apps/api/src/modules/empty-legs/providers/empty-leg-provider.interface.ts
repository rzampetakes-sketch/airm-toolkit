import { EmptyLegListing, EmptyLegProviderSource, EmptyLegSearchParams } from "@travel-platform/types";

/**
 * Every empty-leg source — the platform's own operator-listed inventory,
 * an external aggregator (Avinode, Jettly, JetHunter, Villiers, or any
 * future one), or the mock provider — implements this and returns
 * EmptyLegListing[]. EmptyLegsService merges across every provider bound
 * to the EMPTY_LEG_PROVIDERS token without caring which is which.
 */
export interface EmptyLegProvider {
  readonly source: EmptyLegProviderSource;
  isEnabled(): boolean;
  search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]>;
}

/**
 * DI token for the array of registered EmptyLegProviders (see
 * empty-legs.module.ts). Adding a new aggregator is: write a class
 * implementing EmptyLegProvider, add it to the `useFactory` list below —
 * EmptyLegsService itself (this file's only consumer) never changes.
 */
export const EMPTY_LEG_PROVIDERS = "EMPTY_LEG_PROVIDERS";

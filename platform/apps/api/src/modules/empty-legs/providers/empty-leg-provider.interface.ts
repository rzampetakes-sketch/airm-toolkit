import { EmptyLegListing, EmptyLegProviderSource, EmptyLegSearchParams } from "@travel-platform/types";

/**
 * Every empty-leg source — the platform's own operator-listed inventory,
 * an external aggregator (Avinode, Jettly), or the mock provider —
 * implements this and returns EmptyLegListing[]. EmptyLegsService merges
 * across all enabled providers without caring which is which.
 */
export interface EmptyLegProvider {
  readonly source: EmptyLegProviderSource;
  isEnabled(): boolean;
  search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]>;
}

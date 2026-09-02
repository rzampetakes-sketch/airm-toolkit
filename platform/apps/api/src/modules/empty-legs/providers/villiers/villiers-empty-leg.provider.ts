import { Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { EmptyLegProvider } from "../empty-leg-provider.interface";

/**
 * Villiers is a consumer-facing empty-leg broker site — no public
 * developer API documentation was found during research (see
 * docs/architecture/api-provider-research.md). Kept as a seam, same as
 * JettlyEmptyLegProvider: confirm directly with Villiers before relying
 * on this, and note that a broker (as opposed to an operator or Avinode)
 * may only be willing to offer an affiliate/referral link rather than a
 * live inventory feed.
 */
@Injectable()
export class VilliersEmptyLegProvider implements EmptyLegProvider {
  readonly source = "villiers" as const;

  isEnabled(): boolean {
    return Boolean(process.env.VILLIERS_API_KEY);
  }

  async search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]> {
    void params;
    return [];
  }
}

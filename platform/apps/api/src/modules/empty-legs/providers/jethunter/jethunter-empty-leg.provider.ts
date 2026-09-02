import { Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { EmptyLegProvider } from "../empty-leg-provider.interface";

/**
 * JetHunter (jethunter.aero) is a private jet charter/sales broker that
 * markets empty legs at a discount to business-class fares — no public
 * developer API documentation was found during research (see
 * docs/architecture/api-provider-research.md). Same caveat as Jettly and
 * Villiers: confirm directly before relying on this as a data source.
 */
@Injectable()
export class JetHunterEmptyLegProvider implements EmptyLegProvider {
  readonly source = "jethunter" as const;

  isEnabled(): boolean {
    return Boolean(process.env.JETHUNTER_API_KEY);
  }

  async search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]> {
    void params;
    return [];
  }
}

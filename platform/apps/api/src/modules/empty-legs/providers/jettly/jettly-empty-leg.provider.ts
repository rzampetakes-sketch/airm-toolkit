import { Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { EmptyLegProvider } from "../empty-leg-provider.interface";

/**
 * Jettly advertises "API Integrations" for empty-leg feeds on its
 * marketing site, but no public technical documentation (auth method,
 * request/response shape, rate limits) was found during research —
 * confirm directly with Jettly before committing engineering time here.
 * Kept as a seam so it costs nothing to wire up later if it pans out.
 */
@Injectable()
export class JettlyEmptyLegProvider implements EmptyLegProvider {
  readonly source = "jettly" as const;

  isEnabled(): boolean {
    return Boolean(process.env.JETTLY_API_KEY);
  }

  async search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]> {
    void params;
    return [];
  }
}

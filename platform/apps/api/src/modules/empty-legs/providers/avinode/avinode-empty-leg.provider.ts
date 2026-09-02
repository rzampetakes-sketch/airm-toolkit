import { Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { EmptyLegProvider } from "../empty-leg-provider.interface";

/**
 * Avinode publishes a purpose-built developer program for exactly this
 * use case — "End Client Empty Leg Search" and "End Client Empty Leg
 * Subscription" (webhook push of new/updated listings) — at
 * developer.avinodegroup.com. This is the strongest real candidate for
 * external empty-leg data (see docs/architecture/api-provider-research.md
 * for access-model caveats: it requires an Avinode Marketplace
 * broker/operator account, not an anonymous API key).
 *
 * TODO: replace the fetch stub with a real call once AVINODE_API_KEY is
 * provisioned. Prefer the subscription/webhook flow over polling search
 * for a production integration — Avinode's own docs push toward
 * webhooks as the primary integration pattern.
 */
@Injectable()
export class AvinodeEmptyLegProvider implements EmptyLegProvider {
  readonly source = "avinode" as const;

  isEnabled(): boolean {
    return Boolean(process.env.AVINODE_API_KEY);
  }

  async search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]> {
    void params;
    return [];
  }
}

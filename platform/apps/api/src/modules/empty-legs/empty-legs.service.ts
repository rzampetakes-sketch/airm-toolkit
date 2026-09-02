import { Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { InternalEmptyLegProvider } from "./providers/internal/internal-empty-leg.provider";
import { AvinodeEmptyLegProvider } from "./providers/avinode/avinode-empty-leg.provider";
import { JettlyEmptyLegProvider } from "./providers/jettly/jettly-empty-leg.provider";
import { MockEmptyLegProvider } from "./providers/mock/mock-empty-leg.provider";
import { EmptyLegProvider } from "./providers/empty-leg-provider.interface";

@Injectable()
export class EmptyLegsService {
  private readonly providers: EmptyLegProvider[];

  constructor(
    internal: InternalEmptyLegProvider,
    avinode: AvinodeEmptyLegProvider,
    jettly: JettlyEmptyLegProvider,
    mock: MockEmptyLegProvider,
  ) {
    this.providers = [internal, avinode, jettly, mock];
  }

  /**
   * Merges the platform's own operator-listed inventory with whatever
   * external aggregators are enabled (Avinode/Jettly, once credentialed)
   * into one browsable list, cheapest first.
   */
  async search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]> {
    const enabledProviders = this.providers.filter((provider) => provider.isEnabled());

    const resultsByProvider = await Promise.allSettled(
      enabledProviders.map((provider) => provider.search(params)),
    );

    const listings = resultsByProvider
      .filter((result): result is PromiseFulfilledResult<EmptyLegListing[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    return listings.sort((a, b) => a.amount - b.amount);
  }
}

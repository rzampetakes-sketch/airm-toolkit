import { Inject, Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { EMPTY_LEG_PROVIDERS, EmptyLegProvider } from "./providers/empty-leg-provider.interface";

@Injectable()
export class EmptyLegsService {
  constructor(@Inject(EMPTY_LEG_PROVIDERS) private readonly providers: EmptyLegProvider[]) {}

  /**
   * Merges the platform's own operator-listed inventory with whatever
   * external aggregators are enabled (Avinode, Jettly, JetHunter,
   * Villiers, ...) into one browsable list, cheapest first. This method
   * has no vendor-specific branches and does not grow one as providers
   * are added — see EMPTY_LEG_PROVIDERS in empty-leg-provider.interface.ts.
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

import { Injectable } from "@nestjs/common";
import { TaxiOffer, TaxiSearchParams } from "@travel-platform/types";
import { TaxiProvider } from "../taxi-provider.interface";

/**
 * Contracted airport taxi/chauffeur partner (vendor TBD — e.g. Blacklane,
 * a local chauffeur network, or the same partner as car rentals). Same
 * pattern as the other partner adapters: the one file that changes once
 * a vendor is picked.
 */
@Injectable()
export class PartnerTaxiProvider implements TaxiProvider {
  readonly source = "partner" as const;

  isEnabled(): boolean {
    return Boolean(process.env.PARTNER_TAXI_API_KEY);
  }

  async search(params: TaxiSearchParams): Promise<TaxiOffer[]> {
    void params;
    return [];
  }
}

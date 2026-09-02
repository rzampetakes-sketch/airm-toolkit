import { Injectable } from "@nestjs/common";
import { CarRentalOffer, CarRentalSearchParams } from "@travel-platform/types";
import { CarRentalProvider } from "../car-rental-provider.interface";

/**
 * Contracted car rental / chauffeur partner (vendor TBD — e.g. a
 * wholesale rental API or a dedicated chauffeur network). Same pattern
 * as PartnerHotelProvider: this is the one file that changes once a
 * vendor is picked.
 */
@Injectable()
export class PartnerCarRentalProvider implements CarRentalProvider {
  readonly source = "partner" as const;

  isEnabled(): boolean {
    return Boolean(process.env.PARTNER_CAR_RENTAL_API_KEY);
  }

  async search(params: CarRentalSearchParams): Promise<CarRentalOffer[]> {
    void params;
    return [];
  }
}

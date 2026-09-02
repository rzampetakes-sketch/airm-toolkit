import { Injectable } from "@nestjs/common";
import { HotelOffer, HotelSearchParams } from "@travel-platform/types";
import { HotelProvider } from "../hotel-provider.interface";

/**
 * Our contracted hotel inventory partner. Which vendor this actually
 * calls (a wholesale/B2B rate API such as HotelBeds, Booking.com Partner
 * Hub, Expedia Rapid, or a bespoke luxury-hotel consortium) is a
 * commercial decision, not an architectural one — this file is the one
 * place that changes once that vendor is picked; HotelsService and the
 * checkout flow only depend on HotelProvider.
 *
 * TODO: replace the fetch stub with the chosen partner's real SDK/REST
 * calls once PARTNER_HOTEL_API_KEY is provisioned.
 */
@Injectable()
export class PartnerHotelProvider implements HotelProvider {
  readonly source = "partner" as const;

  isEnabled(): boolean {
    return Boolean(process.env.PARTNER_HOTEL_API_KEY);
  }

  async search(params: HotelSearchParams): Promise<HotelOffer[]> {
    void params;
    return [];
  }
}

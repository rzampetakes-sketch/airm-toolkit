import { Module } from "@nestjs/common";
import { HotelsService } from "./hotels.service";
import { HotelsController } from "./hotels.controller";
import { HOTEL_PROVIDERS } from "./providers/hotel-provider.interface";
import { MockHotelProvider } from "./providers/mock/mock-hotel.provider";
import { PartnerHotelProvider } from "./providers/partner/partner-hotel.provider";

@Module({
  controllers: [HotelsController],
  providers: [
    HotelsService,
    MockHotelProvider,
    PartnerHotelProvider,
    {
      provide: HOTEL_PROVIDERS,
      useFactory: (partner: PartnerHotelProvider, mock: MockHotelProvider) => [partner, mock],
      inject: [PartnerHotelProvider, MockHotelProvider],
    },
  ],
  exports: [HotelsService],
})
export class HotelsModule {}

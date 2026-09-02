import { Module } from "@nestjs/common";
import { CarRentalsService } from "./car-rentals.service";
import { CarRentalsController } from "./car-rentals.controller";
import { CAR_RENTAL_PROVIDERS } from "./providers/car-rental-provider.interface";
import { MockCarRentalProvider } from "./providers/mock/mock-car-rental.provider";
import { PartnerCarRentalProvider } from "./providers/partner/partner-car-rental.provider";

@Module({
  controllers: [CarRentalsController],
  providers: [
    CarRentalsService,
    MockCarRentalProvider,
    PartnerCarRentalProvider,
    {
      provide: CAR_RENTAL_PROVIDERS,
      useFactory: (partner: PartnerCarRentalProvider, mock: MockCarRentalProvider) => [partner, mock],
      inject: [PartnerCarRentalProvider, MockCarRentalProvider],
    },
  ],
  exports: [CarRentalsService],
})
export class CarRentalsModule {}

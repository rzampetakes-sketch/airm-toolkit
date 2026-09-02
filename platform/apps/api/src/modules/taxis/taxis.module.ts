import { Module } from "@nestjs/common";
import { TaxisService } from "./taxis.service";
import { TaxisController } from "./taxis.controller";
import { TAXI_PROVIDERS } from "./providers/taxi-provider.interface";
import { MockTaxiProvider } from "./providers/mock/mock-taxi.provider";
import { PartnerTaxiProvider } from "./providers/partner/partner-taxi.provider";

@Module({
  controllers: [TaxisController],
  providers: [
    TaxisService,
    MockTaxiProvider,
    PartnerTaxiProvider,
    {
      provide: TAXI_PROVIDERS,
      useFactory: (partner: PartnerTaxiProvider, mock: MockTaxiProvider) => [partner, mock],
      inject: [PartnerTaxiProvider, MockTaxiProvider],
    },
  ],
  exports: [TaxisService],
})
export class TaxisModule {}

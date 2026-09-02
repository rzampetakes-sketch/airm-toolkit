import { Module } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchController } from "./search.controller";
import { DuffelAdapter } from "../integrations/duffel/duffel.adapter";
import { AvinodeAdapter } from "../integrations/avinode/avinode.adapter";
import { PricingModule } from "../pricing/pricing.module";

@Module({
  imports: [PricingModule],
  controllers: [SearchController],
  providers: [SearchService, DuffelAdapter, AvinodeAdapter],
})
export class SearchModule {}

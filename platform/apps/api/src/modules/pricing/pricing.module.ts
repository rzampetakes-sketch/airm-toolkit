import { Module } from "@nestjs/common";
import { PricingService } from "./pricing.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Module({
  providers: [PricingService, PrismaService],
  exports: [PricingService],
})
export class PricingModule {}

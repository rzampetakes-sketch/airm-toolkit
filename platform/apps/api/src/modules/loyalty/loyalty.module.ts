import { Module } from "@nestjs/common";
import { LoyaltyService } from "./loyalty.service";
import { PrismaService } from "../../common/prisma/prisma.service";

@Module({
  providers: [LoyaltyService, PrismaService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}

import { Module } from "@nestjs/common";
import { BookingService } from "./booking.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LoyaltyModule } from "../loyalty/loyalty.module";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [LoyaltyModule, PaymentsModule],
  providers: [BookingService, PrismaService],
  exports: [BookingService],
})
export class BookingModule {}

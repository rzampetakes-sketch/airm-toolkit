import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { StripeAdapter } from "../integrations/stripe/stripe.adapter";
import { PrismaService } from "../../common/prisma/prisma.service";

@Module({
  providers: [PaymentsService, StripeAdapter, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

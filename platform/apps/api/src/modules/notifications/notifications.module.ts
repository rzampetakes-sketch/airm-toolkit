import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { TwilioAdapter } from "../integrations/twilio/twilio.adapter";
import { PrismaService } from "../../common/prisma/prisma.service";

@Module({
  providers: [NotificationsService, TwilioAdapter, PrismaService],
  exports: [NotificationsService],
})
export class NotificationsModule {}

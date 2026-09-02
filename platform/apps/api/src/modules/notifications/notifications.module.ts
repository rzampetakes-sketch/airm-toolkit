import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { TwilioAdapter } from "../integrations/twilio/twilio.adapter";

@Module({
  providers: [NotificationsService, TwilioAdapter],
  exports: [NotificationsService],
})
export class NotificationsModule {}

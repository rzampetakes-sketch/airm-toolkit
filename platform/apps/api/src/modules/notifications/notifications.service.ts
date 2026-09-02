import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TwilioAdapter } from "../integrations/twilio/twilio.adapter";

/**
 * TODO: back this with a BullMQ queue (`notifications` queue) so
 * WhatsApp/SMS/email sends are retried on transient failure and never
 * block the booking request/response cycle. This stub sends inline.
 */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twilioAdapter: TwilioAdapter,
  ) {}

  async sendBookingConfirmation(userId: string, bookingId: string, phone: string) {
    await this.twilioAdapter.send("whatsapp", phone, "Your booking is confirmed. Your e-ticket will follow shortly.");

    return this.prisma.notificationLog.create({
      data: {
        userId,
        bookingId,
        channel: "whatsapp",
        template: "booking_confirmation",
        status: "sent",
        sentAt: new Date(),
      },
    });
  }
}

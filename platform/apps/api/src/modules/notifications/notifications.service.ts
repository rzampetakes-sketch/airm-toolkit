import { Injectable } from "@nestjs/common";
import { TwilioAdapter } from "../integrations/twilio/twilio.adapter";

/**
 * Not part of the current two-part MVP scope (business-class search +
 * empty-leg marketplace) beyond a basic booking confirmation, but kept
 * as its own module/adapter seam since every booking flow ends up
 * needing at least a confirmation message.
 *
 * TODO: back this with a BullMQ queue so sends are retried on transient
 * failure and never block the booking request/response cycle.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly twilioAdapter: TwilioAdapter) {}

  sendBookingConfirmation(phone: string) {
    return this.twilioAdapter.send("whatsapp", phone, "Your booking is confirmed. Your e-ticket will follow shortly.");
  }
}

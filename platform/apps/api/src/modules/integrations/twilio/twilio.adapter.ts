import { Injectable } from "@nestjs/common";
import twilio from "twilio";

export type NotificationChannel = "whatsapp" | "sms";

@Injectable()
export class TwilioAdapter {
  private readonly client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  async send(channel: NotificationChannel, to: string, body: string) {
    const from = channel === "whatsapp" ? `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}` : process.env.TWILIO_WHATSAPP_FROM;
    const formattedTo = channel === "whatsapp" ? `whatsapp:${to}` : to;

    return this.client.messages.create({ from, to: formattedTo, body });
  }
}

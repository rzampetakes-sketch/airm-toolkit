import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StripeAdapter } from "../integrations/stripe/stripe.adapter";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeAdapter: StripeAdapter,
  ) {}

  async createPaymentForBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });

    const paymentIntent = await this.stripeAdapter.createPaymentIntent({
      amount: Number(booking.totalAmount),
      currency: booking.currency,
      bookingId: booking.id,
    });

    return this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        platformFeeAmount: 0,
        status: "unpaid",
      },
    });
  }
}

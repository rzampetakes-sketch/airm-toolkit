import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { StripeAdapter } from "../integrations/stripe/stripe.adapter";

const EMPTY_LEG_PLATFORM_COMMISSION_RATE = 0.15;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeAdapter: StripeAdapter,
  ) {}

  /**
   * Commercial flight bookings charge the traveler in full — the
   * platform buys the fare from the GDS/NDC provider directly. Empty-leg
   * bookings split the charge with the listing Operator via Stripe
   * Connect, minus the platform's commission, once the operator has
   * completed Connect onboarding (`stripeConnectedAccountId` set).
   */
  async createPaymentForBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { emptyLeg: { include: { operator: true } } },
    });

    const operatorAccount = booking.emptyLeg?.operator?.stripeConnectedAccountId ?? undefined;
    const platformFeeAmount = operatorAccount
      ? Number(booking.totalAmount) * EMPTY_LEG_PLATFORM_COMMISSION_RATE
      : 0;

    const paymentIntent = await this.stripeAdapter.createPaymentIntent({
      amount: Number(booking.totalAmount),
      currency: booking.currency,
      bookingId: booking.id,
      operatorConnectedAccountId: operatorAccount,
      platformFeeAmount,
    });

    return this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: booking.totalAmount,
        currency: booking.currency,
        platformFeeAmount,
        status: "unpaid",
      },
    });
  }
}

import { Injectable } from "@nestjs/common";
import Stripe from "stripe";

/**
 * Platform is the merchant of record: charges the traveler on the
 * platform's own Stripe account, and (for charter) optionally splits a
 * payout to the operator's connected account via Stripe Connect.
 */
@Injectable()
export class StripeAdapter {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2024-06-20",
  });

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    bookingId: string;
    operatorConnectedAccountId?: string;
    platformFeeAmount?: number;
  }) {
    const amountInMinorUnits = Math.round(params.amount * 100);

    return this.stripe.paymentIntents.create({
      amount: amountInMinorUnits,
      currency: params.currency.toLowerCase(),
      metadata: { bookingId: params.bookingId },
      ...(params.operatorConnectedAccountId
        ? {
            application_fee_amount: Math.round((params.platformFeeAmount ?? 0) * 100),
            transfer_data: { destination: params.operatorConnectedAccountId },
          }
        : {}),
    });
  }

  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET ?? "",
    );
  }
}

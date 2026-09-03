import { Injectable } from "@nestjs/common";
import Stripe from "stripe";

/**
 * Platform is the merchant of record: charges the traveler on the
 * platform's own Stripe account, and (for empty-leg bookings against a
 * verified operator) optionally splits a payout to the operator's
 * connected account via Stripe Connect.
 *
 * With no STRIPE_SECRET_KEY configured (e.g. local dev, demos), this
 * skips the real Stripe API entirely and returns a synthetic
 * already-succeeded PaymentIntent instead — there is no test/sandbox
 * mode that doesn't require creating a Stripe account, so this is the
 * substitute that lets checkout be exercised end-to-end without one.
 * Once a real STRIPE_SECRET_KEY (test or live) is set, this adapter
 * calls the real Stripe API and no code change is needed.
 */
@Injectable()
export class StripeAdapter {
  private readonly liveMode = Boolean(process.env.STRIPE_SECRET_KEY);
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
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

    if (!this.liveMode) {
      return {
        id: `pi_mock_${params.bookingId}`,
        status: "succeeded",
        amount: amountInMinorUnits,
        currency: params.currency.toLowerCase(),
      } as unknown as Stripe.PaymentIntent;
    }

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

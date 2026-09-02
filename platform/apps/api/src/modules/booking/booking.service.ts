import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * Order management for both flows described in
 * docs/architecture/ARCHITECTURE.md:
 *  - commercial offer -> instant book -> pay -> confirm with adapter
 *  - charter/empty-leg offer -> instant request -> operator confirms via
 *    Avinode webhook -> pay -> notify
 *
 * TODO: wire in the Duffel/Avinode order-creation calls and the
 * queue-backed RFQ workflow; this stub covers the DB-side state machine.
 */
@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromOffer(params: { userId: string; companyId?: string; offerId: string }) {
    const offer = await this.prisma.offer.findUnique({ where: { id: params.offerId } });
    if (!offer) {
      throw new NotFoundException(`Offer ${params.offerId} not found`);
    }

    const initialStatus = offer.offerType === "commercial_flight" ? "pending_payment" : "charter_requested";

    return this.prisma.booking.create({
      data: {
        userId: params.userId,
        companyId: params.companyId,
        offerId: offer.id,
        bookingType: offer.offerType,
        status: initialStatus,
        totalAmount: offer.finalAmount,
        currency: offer.finalCurrency,
      },
    });
  }
}

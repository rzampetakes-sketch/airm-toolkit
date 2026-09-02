import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * Order management for both products: booking a cached Flight offer
 * (Part 1) or an EmptyLeg listing (Part 2). Exactly one of
 * `flightId`/`emptyLegId` is set — enforced here since Prisma has no
 * native "exactly one of" constraint (see schema.prisma comment).
 *
 * TODO: wire in the real vendor order-creation call for commercial
 * flights (Duffel order) once a real provider is enabled, and an
 * operator-confirmation step for empty legs before moving out of
 * `pending_payment`.
 */
@Injectable()
export class BookingService {
  constructor(private readonly prisma: PrismaService) {}

  async bookFlight(userId: string, flightId: string) {
    const flight = await this.prisma.flight.findUnique({ where: { id: flightId } });
    if (!flight) {
      throw new NotFoundException(`Flight ${flightId} not found`);
    }
    if (flight.expiresAt < new Date()) {
      throw new BadRequestException("This fare has expired — please search again");
    }

    return this.prisma.booking.create({
      data: {
        userId,
        bookingType: "flight",
        flightId: flight.id,
        totalAmount: flight.amount,
        currency: flight.currency,
      },
    });
  }

  async bookEmptyLeg(userId: string, emptyLegId: string) {
    return this.prisma.$transaction(async (tx) => {
      const emptyLeg = await tx.emptyLeg.findUnique({ where: { id: emptyLegId } });
      if (!emptyLeg) {
        throw new NotFoundException(`EmptyLeg ${emptyLegId} not found`);
      }
      if (emptyLeg.status !== "available") {
        throw new BadRequestException(`This empty leg is no longer available (status: ${emptyLeg.status})`);
      }

      await tx.emptyLeg.update({ where: { id: emptyLeg.id }, data: { status: "booked" } });

      return tx.booking.create({
        data: {
          userId,
          bookingType: "empty_leg",
          emptyLegId: emptyLeg.id,
          totalAmount: emptyLeg.amount,
          currency: emptyLeg.currency,
        },
      });
    });
  }
}

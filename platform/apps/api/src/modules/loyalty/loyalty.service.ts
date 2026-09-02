import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

const POINTS_PER_CURRENCY_UNIT: Record<string, number> = {
  commercial_flight: 5,
  private_jet_charter: 10,
  empty_leg: 8,
};

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Earn points for a confirmed booking. Rate depends on the *source*
   * (commercial vs. charter vs. empty leg), not on where they'll be
   * redeemed — points earned on a Business Class fare can be redeemed
   * against an empty leg later, and vice versa, since they all land in
   * the same wallet.
   */
  async earnForBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { user: { include: { loyaltyAccount: true } } },
    });

    const rate = POINTS_PER_CURRENCY_UNIT[booking.bookingType] ?? 5;
    const pointsEarned = Math.floor(Number(booking.totalAmount) * rate);

    return this.appendLedgerEntry({
      userId: booking.userId,
      bookingId,
      entryType: "earn",
      source: booking.bookingType,
      points: pointsEarned,
    });
  }

  /**
   * Redeem points as a discount at checkout. Rejects if the account
   * doesn't have sufficient balance — the ledger is the single source of
   * truth for balance, never trust a client-supplied balance.
   */
  async redeem(userId: string, points: number, bookingId?: string) {
    if (points <= 0) {
      throw new BadRequestException("Redemption amount must be positive");
    }

    const account = await this.prisma.loyaltyAccount.findUniqueOrThrow({ where: { userId } });

    if (account.pointsBalance < points) {
      throw new BadRequestException("Insufficient points balance");
    }

    return this.appendLedgerEntry({
      userId,
      bookingId,
      entryType: "redeem",
      source: "redemption",
      points: -points,
    });
  }

  /**
   * Append-only ledger write: every entry records the resulting balance,
   * and the denormalized `LoyaltyAccount.pointsBalance` is updated in the
   * same transaction so the two can never drift.
   */
  private async appendLedgerEntry(params: {
    userId: string;
    bookingId?: string;
    entryType: "earn" | "redeem" | "adjust" | "expire";
    source: string;
    points: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.loyaltyAccount.upsert({
        where: { userId: params.userId },
        create: { userId: params.userId, pointsBalance: 0 },
        update: {},
      });

      const balanceAfter = account.pointsBalance + params.points;

      const entry = await tx.loyaltyLedgerEntry.create({
        data: {
          loyaltyAccountId: account.id,
          bookingId: params.bookingId,
          entryType: params.entryType,
          source: params.source,
          points: params.points,
          balanceAfter,
        },
      });

      await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: { pointsBalance: balanceAfter },
      });

      return entry;
    });
  }
}

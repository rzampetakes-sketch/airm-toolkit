import { Injectable } from "@nestjs/common";
import { LoyaltyMembership } from "@travel-platform/types";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { operator: true, loyaltyMemberships: true } });
  }

  /**
   * Saves (or updates) a user's frequent-flyer number for one airline —
   * a profile convenience so it doesn't need re-entering every booking.
   * See packages/types LoyaltyMembership: this is a pass-through to the
   * airline, not a platform-run points program.
   */
  upsertLoyaltyMembership(userId: string, membership: LoyaltyMembership) {
    return this.prisma.loyaltyMembership.upsert({
      where: { userId_airlineIataCode: { userId, airlineIataCode: membership.airlineIataCode } },
      create: { userId, airlineIataCode: membership.airlineIataCode, membershipNumber: membership.membershipNumber },
      update: { membershipNumber: membership.membershipNumber },
    });
  }
}

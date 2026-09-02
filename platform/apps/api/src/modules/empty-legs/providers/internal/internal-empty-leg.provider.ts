import { Injectable } from "@nestjs/common";
import { EmptyLegListing, EmptyLegSearchParams } from "@travel-platform/types";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { EmptyLegProvider } from "../empty-leg-provider.interface";

/**
 * The platform's own marketplace inventory — listings Operators created
 * directly (via the operator portal / operators.controller.ts), not
 * pulled from an external aggregator. Always enabled: this is first-
 * party data, not a vendor integration with credentials to check.
 */
@Injectable()
export class InternalEmptyLegProvider implements EmptyLegProvider {
  readonly source = "platform_listed" as const;

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return true;
  }

  async search(params: EmptyLegSearchParams): Promise<EmptyLegListing[]> {
    const rows = await this.prisma.emptyLeg.findMany({
      where: {
        source: "platform_listed",
        status: "available",
        ...(params.origin ? { origin: params.origin } : {}),
        ...(params.destination ? { destination: params.destination } : {}),
        departureAt: { gte: new Date(params.earliestDeparture), lte: new Date(params.latestDeparture) },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      source: "platform_listed",
      operatorId: row.operatorId ?? undefined,
      operatorName: row.operatorName,
      aircraftType: row.aircraftType,
      origin: row.origin,
      destination: row.destination,
      departureAt: row.departureAt.toISOString(),
      arrivalAt: row.arrivalAt.toISOString(),
      seatsAvailable: row.seatsAvailable,
      amount: Number(row.amount),
      currency: row.currency,
      status: row.status,
    }));
  }
}

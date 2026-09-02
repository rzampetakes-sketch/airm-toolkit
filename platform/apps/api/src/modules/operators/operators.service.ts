import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class OperatorsService {
  constructor(private readonly prisma: PrismaService) {}

  register(params: { name: string; contactEmail: string; contactPhone?: string; certificateNumber?: string }) {
    return this.prisma.operator.create({ data: params });
  }

  /**
   * Operators list their own empty legs directly — this is the
   * first-party marketplace inventory that InternalEmptyLegProvider
   * reads back out (see modules/empty-legs/providers/internal).
   */
  listEmptyLeg(
    operatorId: string,
    params: {
      aircraftType: string;
      origin: string;
      destination: string;
      departureAt: Date;
      arrivalAt: Date;
      seatsAvailable: number;
      amount: number;
      currency: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const operator = await tx.operator.findUniqueOrThrow({ where: { id: operatorId } });

      return tx.emptyLeg.create({
        data: {
          operatorId: operator.id,
          operatorName: operator.name,
          source: "platform_listed",
          ...params,
        },
      });
    });
  }
}

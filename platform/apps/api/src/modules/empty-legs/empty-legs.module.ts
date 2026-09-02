import { Module } from "@nestjs/common";
import { EmptyLegsService } from "./empty-legs.service";
import { EmptyLegsController } from "./empty-legs.controller";
import { EMPTY_LEG_PROVIDERS } from "./providers/empty-leg-provider.interface";
import { InternalEmptyLegProvider } from "./providers/internal/internal-empty-leg.provider";
import { AvinodeEmptyLegProvider } from "./providers/avinode/avinode-empty-leg.provider";
import { JettlyEmptyLegProvider } from "./providers/jettly/jettly-empty-leg.provider";
import { JetHunterEmptyLegProvider } from "./providers/jethunter/jethunter-empty-leg.provider";
import { VilliersEmptyLegProvider } from "./providers/villiers/villiers-empty-leg.provider";
import { MockEmptyLegProvider } from "./providers/mock/mock-empty-leg.provider";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * The empty-leg provider roster lives entirely in this module's
 * `useFactory`. To add another aggregator: implement EmptyLegProvider,
 * add the class to `providers` below and to the factory's argument list.
 * Nothing in empty-legs.service.ts, the controller, or any other module
 * needs to change.
 */
@Module({
  controllers: [EmptyLegsController],
  providers: [
    EmptyLegsService,
    InternalEmptyLegProvider,
    AvinodeEmptyLegProvider,
    JettlyEmptyLegProvider,
    JetHunterEmptyLegProvider,
    VilliersEmptyLegProvider,
    MockEmptyLegProvider,
    PrismaService,
    {
      provide: EMPTY_LEG_PROVIDERS,
      useFactory: (
        internal: InternalEmptyLegProvider,
        avinode: AvinodeEmptyLegProvider,
        jettly: JettlyEmptyLegProvider,
        jethunter: JetHunterEmptyLegProvider,
        villiers: VilliersEmptyLegProvider,
        mock: MockEmptyLegProvider,
      ) => [internal, avinode, jettly, jethunter, villiers, mock],
      inject: [
        InternalEmptyLegProvider,
        AvinodeEmptyLegProvider,
        JettlyEmptyLegProvider,
        JetHunterEmptyLegProvider,
        VilliersEmptyLegProvider,
        MockEmptyLegProvider,
      ],
    },
  ],
  exports: [EmptyLegsService],
})
export class EmptyLegsModule {}

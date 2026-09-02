import { Module } from "@nestjs/common";
import { EmptyLegsService } from "./empty-legs.service";
import { EmptyLegsController } from "./empty-legs.controller";
import { InternalEmptyLegProvider } from "./providers/internal/internal-empty-leg.provider";
import { AvinodeEmptyLegProvider } from "./providers/avinode/avinode-empty-leg.provider";
import { JettlyEmptyLegProvider } from "./providers/jettly/jettly-empty-leg.provider";
import { MockEmptyLegProvider } from "./providers/mock/mock-empty-leg.provider";
import { PrismaService } from "../../common/prisma/prisma.service";

@Module({
  controllers: [EmptyLegsController],
  providers: [
    EmptyLegsService,
    InternalEmptyLegProvider,
    AvinodeEmptyLegProvider,
    JettlyEmptyLegProvider,
    MockEmptyLegProvider,
    PrismaService,
  ],
  exports: [EmptyLegsService],
})
export class EmptyLegsModule {}

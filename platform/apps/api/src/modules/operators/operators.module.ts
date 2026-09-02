import { Module } from "@nestjs/common";
import { OperatorsService } from "./operators.service";
import { OperatorsController } from "./operators.controller";
import { PrismaService } from "../../common/prisma/prisma.service";

@Module({
  controllers: [OperatorsController],
  providers: [OperatorsService, PrismaService],
  exports: [OperatorsService],
})
export class OperatorsModule {}

import { Body, Controller, Param, Post } from "@nestjs/common";
import { OperatorsService } from "./operators.service";

class RegisterOperatorDto {
  name!: string;
  contactEmail!: string;
  contactPhone?: string;
  certificateNumber?: string;
}

class ListEmptyLegDto {
  aircraftType!: string;
  origin!: string;
  destination!: string;
  departureAt!: string;
  arrivalAt!: string;
  seatsAvailable!: number;
  amount!: number;
  currency!: string;
}

@Controller("operators")
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  @Post()
  register(@Body() dto: RegisterOperatorDto) {
    return this.operatorsService.register(dto);
  }

  @Post(":operatorId/empty-legs")
  listEmptyLeg(@Param("operatorId") operatorId: string, @Body() dto: ListEmptyLegDto) {
    return this.operatorsService.listEmptyLeg(operatorId, {
      ...dto,
      departureAt: new Date(dto.departureAt),
      arrivalAt: new Date(dto.arrivalAt),
    });
  }
}

import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { LoyaltyMembership } from "@travel-platform/types";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(":id")
  findById(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Post(":id/loyalty-memberships")
  upsertLoyaltyMembership(@Param("id") id: string, @Body() dto: LoyaltyMembership) {
    return this.usersService.upsertLoyaltyMembership(id, dto);
  }
}

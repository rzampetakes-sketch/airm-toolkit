import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthService } from "./auth.service";
import { AuthenticatedRequest, JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("register")
  register(@Body() dto: { email: string; password: string; firstName: string; lastName: string }) {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: { email: string; password: string }) {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthenticatedRequest) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
  }
}

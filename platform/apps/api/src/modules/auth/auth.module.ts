import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || "15m") as `${number}${"s" | "m" | "h" | "d"}` },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}

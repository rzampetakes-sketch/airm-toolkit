import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

export interface AuthenticatedRequest extends Request {
  userId: string;
}

/** Protects a route with a required `Authorization: Bearer <token>` header, attaching `req.userId`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;

    if (!token) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    try {
      const payload = this.jwtService.verify<{ sub: string }>(token);
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token.");
    }
  }
}

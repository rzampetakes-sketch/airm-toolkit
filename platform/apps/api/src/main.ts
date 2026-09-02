import "dotenv/config";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Open CORS, globally, for every route — the frontend (apps/web) calls
  // this API directly from the browser. Tighten to an allowlist before
  // any real production deployment.
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api/v1");
  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();

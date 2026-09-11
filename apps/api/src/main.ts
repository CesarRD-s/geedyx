import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { configureStaticAssets } from './static-assets.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const origins = config
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  app.use(cookieParser());
  configureStaticAssets(app);

  // Behind a reverse proxy the throttler needs the real client IP; otherwise
  // rate limits are keyed on the proxy and effectively shared by every visitor.
  if (config.get<string>('TRUST_PROXY') === 'true') {
    app.set('trust proxy', true);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(config.get<string>('PORT', '3001'));
}
await bootstrap();
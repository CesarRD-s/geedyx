import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { Response } from 'express';
import { AppModule } from './app.module.js';
import { configureStaticAssets } from './static-assets.js';
import { ApiExceptionFilter } from './http/api-exception.filter.js';
import type { RequestWithId } from './http/request-context.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

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
  if (config.get<boolean>('TRUST_PROXY', false)) {
    app.set('trust proxy', true);
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  if (config.get<boolean>('OPENAPI_ENABLED', false)) {
    const openApiConfig = new DocumentBuilder()
      .setTitle('GEEDYX API')
      .setDescription(
        'Versioned REST contract for the GEEDYX internal workspace and integrations.',
      )
      .setVersion('1.0')
      .addCookieAuth('geedyx_session')
      .build();
    const document = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
    });
  }

  await app.init();
  app.use((request: RequestWithId, response: Response) => {
    response.status(404).json({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'La ruta solicitada no existe.',
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
      path: request.path,
    });
  });

  await app.listen(config.get<number>('PORT', 3001));
}
await bootstrap();

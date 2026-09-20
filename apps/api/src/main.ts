import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiResponseInterceptor } from './http/api-response.interceptor';
import { ProblemDetailsFilter } from './http/problem-details.filter';
import { requestIdMiddleware } from './http/request-id.middleware';
import type { AppEnvironment } from './config/environment';

function validationErrors(
  errors: Array<{ property: string; constraints?: Record<string, string> }>,
) {
  return errors.flatMap((error) =>
    Object.entries(error.constraints ?? {}).map(([code, message]) => ({
      field: error.property,
      code: code.toUpperCase(),
      message,
    })),
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<AppEnvironment, true>);
  const environment = config.get('NODE_ENV', { infer: true });

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          code: 'VALIDATION_ERROR',
          detail: 'Revisa los campos enviados.',
          errors: validationErrors(errors),
        }),
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  await app.listen(
    config.get('API_PORT', { infer: true }),
    config.get('API_HOST', { infer: true }),
  );
  if (environment === 'development') {
    console.log(
      `Geedyx API listening on http://localhost:${config.get('API_PORT', { infer: true })}`,
    );
  }
}

void bootstrap();

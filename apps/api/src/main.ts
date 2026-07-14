import 'reflect-metadata';
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { EnvValidationError, loadConfig, type AppConfig } from '@developeros/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Application entry point.
 *
 * Environment validation runs first and, on failure, prints an aggregated
 * message and exits with a non-zero code before any framework code executes
 * (fail-fast). Only after a valid configuration is obtained is the Nest
 * application created, wired with the global error filter, CORS from the
 * validated origins, and Swagger docs.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  let config: AppConfig;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      logger.error(error.message);
    } else {
      logger.error(
        'Failed to load configuration',
        error instanceof Error ? error.stack : String(error),
      );
    }
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule.register(config));

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: config.CORS_ORIGINS, credentials: true });
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DeveloperOS API')
    .setDescription('DeveloperOS backend API — Phase 1 foundation.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(config.PORT);
  logger.log(`API listening on http://localhost:${config.PORT} (Swagger docs at /docs)`);
}

void bootstrap();

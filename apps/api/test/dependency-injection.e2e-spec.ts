import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type AppConfig } from '@developeros/config';
import { AppModule } from '../src/app.module';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Dependency-injection integration test.
 *
 * Boots the REAL application module graph via Nest's IoC container and resolves
 * providers from it — nothing is constructed by hand. Its purpose is to guard
 * against the class of runtime bug where a constructor-injected provider is
 * imported with `import type`: with `emitDecoratorMetadata` on, a type-only
 * import is erased and TypeScript emits `Object` for the parameter, so Nest
 * cannot resolve the dependency. If `HealthService`'s `PrismaService` dependency
 * (or `HealthController`'s `HealthService` dependency) were type-only, compiling
 * the module below would throw "Nest can't resolve dependencies of ...".
 *
 * `PrismaService` is overridden with a lightweight double so the graph boots
 * without requiring the Prisma engine binary in the test environment. This does
 * not weaken the check: the override is matched by the real `PrismaService`
 * token, and `HealthService` can only receive it if its constructor metadata
 * correctly references that class at runtime.
 */
function buildTestConfig(): AppConfig {
  return {
    NODE_ENV: 'test',
    PORT: 4000,
    DATABASE_URL: 'postgresql://localhost:5432/developeros_test',
    JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-01',
    JWT_REFRESH_SECRET: 'test-refresh-secret-test-refresh-secret-1',
    CORS_ORIGINS: ['http://localhost:3000'],
    isProduction: false,
    isDevelopment: false,
    isTest: true,
  };
}

describe('Dependency injection (e2e, real module graph)', () => {
  let app: INestApplication;

  const prismaDouble = {
    onModuleInit: async (): Promise<void> => undefined,
    onModuleDestroy: async (): Promise<void> => undefined,
    $connect: async (): Promise<void> => undefined,
    $disconnect: async (): Promise<void> => undefined,
    isDatabaseReachable: async (): Promise<boolean> => true,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(buildTestConfig())],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaDouble)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('resolves HealthController from the container', () => {
    expect(app.get(HealthController)).toBeInstanceOf(HealthController);
  });

  it('resolves HealthService from the container', () => {
    expect(app.get(HealthService)).toBeInstanceOf(HealthService);
  });

  it('resolves the PrismaService token from the container', () => {
    // Resolves via the real PrismaService token (returns the injected double).
    expect(app.get(PrismaService)).toBe(prismaDouble);
  });

  it('serves GET /health/live with 200 through the resolved graph', async () => {
    const response = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(response.body.status).toBe('ok');
  });
});

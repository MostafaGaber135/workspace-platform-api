import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type AppConfig } from '@developeros/config';
import { HealthStatus } from '@developeros/shared-types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Health endpoints (e2e) — HTTP routing and readiness logic.
 *
 * This suite verifies routing, controller, and service wiring. It does NOT use
 * a real PostgreSQL: `PrismaService` is replaced with a double whose
 * `isDatabaseReachable()` is controlled per-test. This is honest because:
 *  - `/health/live` genuinely never queries the database (its handler returns
 *    process liveness only), so a stub is irrelevant to what it asserts;
 *  - `/health/ready` is exercised for BOTH reachable and unreachable database
 *    states by toggling the stub, verifying the 200/503 contract.
 *
 * Real database connectivity (a live `SELECT 1`) is covered separately by
 * `database.integration-spec.ts` against an actual PostgreSQL in CI.
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

async function createApp(databaseReachable: boolean): Promise<INestApplication> {
  const prismaDouble = {
    onModuleInit: async (): Promise<void> => undefined,
    onModuleDestroy: async (): Promise<void> => undefined,
    $connect: async (): Promise<void> => undefined,
    $disconnect: async (): Promise<void> => undefined,
    isDatabaseReachable: async (): Promise<boolean> => databaseReachable,
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(buildTestConfig())],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaDouble)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('Health endpoints (e2e, HTTP routing; Prisma stubbed, no real database)', () => {
  describe('GET /health/live', () => {
    let app: INestApplication;

    beforeAll(async () => {
      // Database is reported unreachable to prove liveness is independent of it.
      app = await createApp(false);
    });
    afterAll(async () => app.close());

    it('returns 200 with an OK liveness payload even when the database is down', async () => {
      const response = await request(app.getHttpServer()).get('/health/live').expect(200);
      expect(response.body.status).toBe(HealthStatus.OK);
      expect(response.body.version).toBe('0.1.0');
      expect(typeof response.body.uptimeSeconds).toBe('number');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });

  describe('GET /health/ready', () => {
    it('returns 200 with ok/up when the database is reachable', async () => {
      const app = await createApp(true);
      try {
        const response = await request(app.getHttpServer()).get('/health/ready').expect(200);
        expect(response.body.status).toBe('ok');
        expect(response.body.database).toBe('up');
      } finally {
        await app.close();
      }
    });

    it('returns 503 with error/down when the database is unreachable', async () => {
      const app = await createApp(false);
      try {
        const response = await request(app.getHttpServer()).get('/health/ready').expect(503);
        expect(response.body.status).toBe('error');
        expect(response.body.database).toBe('down');
      } finally {
        await app.close();
      }
    });
  });
});

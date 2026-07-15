import { type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { type AppConfig } from '@developeros/config';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestAuthGuard } from './support/test-auth.guard';

/**
 * Workspace HTTP e2e — routing, status codes, strict validation, the shared
 * error envelope, and fail-closed auth. Prisma is stubbed (no real database),
 * matching the existing e2e style; real persistence is covered by
 * `workspace.integration-spec.ts`. A TEST-ONLY guard populates `request.user`
 * from `x-test-user-id`; it is never part of the production AppModule.
 */
const T0 = new Date('2026-07-13T12:00:00.000Z');
const workspaceRow = {
  id: 'w1',
  name: 'Alpha',
  normalizedName: 'alpha',
  ownerId: 'u1',
  createdAt: T0,
  updatedAt: T0,
};

const tx = {
  workspace: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  workspaceMember: { create: jest.fn() },
  auditLog: { create: jest.fn() },
};
const prismaStub = {
  onModuleInit: async (): Promise<void> => undefined,
  onModuleDestroy: async (): Promise<void> => undefined,
  $connect: async (): Promise<void> => undefined,
  $disconnect: async (): Promise<void> => undefined,
  isDatabaseReachable: async (): Promise<boolean> => true,
  $transaction: async (cb: (t: typeof tx) => unknown) => cb(tx),
  workspace: { findMany: jest.fn(), findFirst: jest.fn() },
};

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

describe('Workspace endpoints (e2e, Prisma stubbed + test-only auth)', () => {
  let app: INestApplication;
  const USER = 'u1';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(buildTestConfig())],
      providers: [{ provide: APP_GUARD, useClass: TestAuthGuard }],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 with the shared envelope when unauthenticated', async () => {
    const res = await request(app.getHttpServer()).get('/workspaces').expect(401);
    expect(res.body).toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401, path: '/workspaces' });
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('creates a workspace (201) and never leaks normalizedName', async () => {
    tx.workspace.findFirst.mockResolvedValue(null);
    tx.workspace.create.mockResolvedValue(workspaceRow);
    tx.workspaceMember.create.mockResolvedValue({ id: 'm1' });
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('x-test-user-id', USER)
      .send({ name: 'Alpha' })
      .expect(201);

    expect(res.body).toEqual({
      id: 'w1',
      name: 'Alpha',
      ownerId: 'u1',
      createdAt: T0.toISOString(),
      updatedAt: T0.toISOString(),
    });
    expect(res.body).not.toHaveProperty('normalizedName');
  });

  it('rejects unknown body properties (strict validation, 400 envelope)', async () => {
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('x-test-user-id', USER)
      .send({ name: 'Alpha', ownerId: 'attacker' })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.details).toBeDefined();
  });

  it('rejects an empty name (400)', async () => {
    const res = await request(app.getHttpServer())
      .post('/workspaces')
      .set('x-test-user-id', USER)
      .send({ name: '   ' })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('returns 404 (not 403) for a workspace not owned by the caller', async () => {
    prismaStub.workspace.findFirst.mockResolvedValue(null);
    const res = await request(app.getHttpServer())
      .get('/workspaces/someone-elses-id')
      .set('x-test-user-id', USER)
      .expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  it('lists workspaces (200) without normalizedName', async () => {
    prismaStub.workspace.findMany.mockResolvedValue([workspaceRow]);
    const res = await request(app.getHttpServer())
      .get('/workspaces')
      .set('x-test-user-id', USER)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).not.toHaveProperty('normalizedName');
    expect(res.body[0].id).toBe('w1');
  });
});

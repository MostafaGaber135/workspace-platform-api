import { DependencyStatus, HealthStatus } from '@developeros/shared-types';
import { type PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

function buildService(reachable: boolean): HealthService {
  const prismaStub = {
    isDatabaseReachable: async (): Promise<boolean> => reachable,
  } as unknown as PrismaService;
  return new HealthService(prismaStub);
}

describe('HealthService', () => {
  describe('checkLiveness', () => {
    const service = buildService(true);

    it('reports an OK liveness status without consulting the database', () => {
      const result = service.checkLiveness();
      expect(result.status).toBe(HealthStatus.OK);
    });

    it('includes a version and an ISO timestamp', () => {
      const result = service.checkLiveness();
      expect(result.version).toBe('0.1.0');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });

    it('reports a non-negative integer uptime', () => {
      const result = service.checkLiveness();
      expect(Number.isInteger(result.uptimeSeconds)).toBe(true);
      expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkReadiness', () => {
    it('reports ok/up when the database is reachable', async () => {
      const result = await buildService(true).checkReadiness();
      expect(result.status).toBe('ok');
      expect(result.database).toBe(DependencyStatus.UP);
    });

    it('reports error/down when the database is unreachable', async () => {
      const result = await buildService(false).checkReadiness();
      expect(result.status).toBe('error');
      expect(result.database).toBe(DependencyStatus.DOWN);
    });
  });
});

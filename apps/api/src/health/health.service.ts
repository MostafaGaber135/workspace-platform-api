import { Injectable } from '@nestjs/common';
import {
  DependencyStatus,
  HealthStatus,
  type HealthCheckResponse,
  type ReadinessCheckResponse,
} from '@developeros/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/** Semantic version reported by the health endpoints. */
const SERVICE_VERSION = '0.1.0';

/**
 * Produces liveness and readiness signals.
 *
 * Liveness ({@link checkLiveness}) reports process health only (uptime/version)
 * and never touches the database. Readiness ({@link checkReadiness}) probes the
 * database so orchestrators can gate traffic without affecting liveness.
 */
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  checkLiveness(): HealthCheckResponse {
    return {
      status: HealthStatus.OK,
      version: SERVICE_VERSION,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async checkReadiness(): Promise<ReadinessCheckResponse> {
    const reachable = await this.prisma.isDatabaseReachable();
    return {
      status: reachable ? 'ok' : 'error',
      database: reachable ? DependencyStatus.UP : DependencyStatus.DOWN,
      timestamp: new Date().toISOString(),
    };
  }
}

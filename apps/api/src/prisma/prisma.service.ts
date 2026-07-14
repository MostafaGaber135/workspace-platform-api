import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around the generated Prisma client tied to the Nest lifecycle.
 *
 * Startup connection is best-effort and NON-FATAL: if PostgreSQL is unavailable
 * when the process boots, the API still starts and stays live (Prisma connects
 * lazily on the first query). This is what makes `/health/live` genuinely
 * database-independent while `/health/ready` reflects real database state via
 * {@link isDatabaseReachable}. Feature modules inject this service; no module
 * talks to `PrismaClient` directly.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      // Do not crash the process: liveness must not depend on the database.
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Database not reachable at startup; continuing (liveness unaffected). Cause: ${message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Readiness probe. Returns true when a trivial round-trip query succeeds,
   * false otherwise. Never throws.
   */
  async isDatabaseReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

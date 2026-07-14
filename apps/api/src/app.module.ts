import { Module, type DynamicModule } from '@nestjs/common';
import { type AppConfig } from '@developeros/config';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';

/**
 * Root module.
 *
 * Exposed as a dynamic module so the already-validated {@link AppConfig} (loaded
 * and error-checked in `main.ts`) is injected in rather than re-parsed. Phase 1
 * wires configuration, the database layer, the health endpoint, and the auth
 * foundation.
 */
@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [AppConfigModule.forRoot(config), PrismaModule, HealthModule, AuthModule],
    };
  }
}

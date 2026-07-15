import { Module, type DynamicModule } from '@nestjs/common';
import { type AppConfig } from '@developeros/config';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';

/**
 * Root module.
 *
 * Exposed as a dynamic module so the already-validated {@link AppConfig} (loaded
 * and error-checked in `main.ts`) is injected in rather than re-parsed. Wires
 * configuration, the database layer, the health endpoints, the auth foundation,
 * and the Workspace module.
 */
@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        AppConfigModule.forRoot(config),
        PrismaModule,
        HealthModule,
        AuthModule,
        WorkspaceModule,
      ],
    };
  }
}

import { Global, Module, type DynamicModule } from '@nestjs/common';
import { type AppConfig } from '@developeros/config';

/**
 * Injection token for the validated application configuration.
 *
 * Consumers inject the fully-typed {@link AppConfig} with `@Inject(APP_CONFIG)`.
 */
export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Provides the already-validated {@link AppConfig} to the whole application.
 *
 * Environment validation itself happens once in `main.ts` before the Nest
 * application is created (fail-fast). The resulting immutable config object is
 * handed to {@link AppConfigModule.forRoot} and exposed here as a global
 * provider so every module can inject it without re-parsing the environment.
 */
@Global()
@Module({})
export class AppConfigModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppConfigModule,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };
  }
}

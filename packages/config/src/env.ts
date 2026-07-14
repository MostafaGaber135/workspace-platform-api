import { z } from 'zod';

/**
 * Supported runtime environments.
 */
export const NodeEnv = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

export type NodeEnv = (typeof NodeEnv)[keyof typeof NodeEnv];

/**
 * Validates that a string is a bare HTTP/HTTPS origin: scheme + host (+ port),
 * with no path, query, or fragment. A single trailing slash is tolerated.
 */
function isHttpOrigin(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }
  if (url.pathname !== '/' && url.pathname !== '') {
    return false;
  }
  if (url.search !== '' || url.hash !== '') {
    return false;
  }
  return value.replace(/\/$/, '') === url.origin;
}

/**
 * The complete environment contract for the API.
 *
 * Every variable the API depends on is declared here exactly once. Validation
 * runs at process startup so that a misconfigured deployment fails immediately
 * and loudly rather than at the first request (fail-fast).
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum([NodeEnv.DEVELOPMENT, NodeEnv.TEST, NodeEnv.PRODUCTION])
    .default(NodeEnv.DEVELOPMENT),

  /** TCP port the API HTTP server binds to; must be a valid port number. */
  PORT: z.coerce
    .number({ invalid_type_error: 'PORT must be a number' })
    .int('PORT must be an integer')
    .min(1, 'PORT must be between 1 and 65535')
    .max(65535, 'PORT must be between 1 and 65535')
    .default(4000),

  /** PostgreSQL connection string consumed by Prisma. */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string',
    ),

  /** Secret used to sign access tokens. Must be long enough to be secure. */
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),

  /** Secret used to sign refresh tokens. Must differ from the access secret. */
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),

  /** Comma-separated list of allowed CORS origins for the web client. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    )
    .pipe(
      z
        .array(
          z.string().refine(isHttpOrigin, {
            message: 'each CORS origin must be a valid http or https origin (scheme + host only)',
          }),
        )
        .min(1, 'at least one CORS origin is required'),
    ),
});

/**
 * The parsed, strongly-typed application configuration.
 */
export type AppConfig = z.infer<typeof envSchema> & {
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
};

/**
 * Error thrown when environment validation fails. Aggregates every invalid or
 * missing variable into a single readable message so the operator can fix them
 * all at once.
 */
export class EnvValidationError extends Error {
  public readonly issues: Record<string, string[]>;

  constructor(issues: Record<string, string[]>) {
    const summary = Object.entries(issues)
      .map(([key, messages]) => `  - ${key}: ${messages.join('; ')}`)
      .join('\n');
    super(`Invalid environment configuration:\n${summary}`);
    this.name = 'EnvValidationError';
    this.issues = issues;
  }
}

/**
 * Validates and parses the given environment record into a typed
 * {@link AppConfig}. Throws {@link EnvValidationError} on any failure.
 *
 * The cross-field rule that the two JWT secrets must differ is enforced here
 * rather than in the schema so the resulting error message is explicit.
 *
 * @param source Raw environment variables (defaults to `process.env`).
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '(root)';
      const existing = issues[key] ?? [];
      existing.push(issue.message);
      issues[key] = existing;
    }
    throw new EnvValidationError(issues);
  }

  const parsed = result.data;

  if (parsed.JWT_ACCESS_SECRET === parsed.JWT_REFRESH_SECRET) {
    throw new EnvValidationError({
      JWT_REFRESH_SECRET: ['must be different from JWT_ACCESS_SECRET'],
    });
  }

  return {
    ...parsed,
    isProduction: parsed.NODE_ENV === NodeEnv.PRODUCTION,
    isDevelopment: parsed.NODE_ENV === NodeEnv.DEVELOPMENT,
    isTest: parsed.NODE_ENV === NodeEnv.TEST,
  };
}

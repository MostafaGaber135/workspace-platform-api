/**
 * Liveness state surfaced by `GET /health/live`.
 */
export const HealthStatus = {
  OK: 'ok',
  DEGRADED: 'degraded',
  DOWN: 'down',
} as const;

export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus];

/**
 * Response body of `GET /health/live`.
 *
 * Liveness reports that the process is up and serving HTTP. It intentionally
 * does NOT probe the database, so it succeeds even when PostgreSQL is
 * unavailable — this is what lets the API start and stay live during a
 * transient database outage.
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  /** Service semantic version. */
  version: string;
  /** ISO-8601 timestamp (UTC) at which the check ran. */
  timestamp: string;
  /** Process uptime in whole seconds. */
  uptimeSeconds: number;
}

/**
 * Reachability state of a downstream dependency (e.g. the database).
 */
export const DependencyStatus = {
  UP: 'up',
  DOWN: 'down',
} as const;

export type DependencyStatus = (typeof DependencyStatus)[keyof typeof DependencyStatus];

/**
 * Response body of `GET /health/ready`.
 *
 * Readiness probes the database. It returns HTTP 200 with `status: 'ok'` when
 * the database is reachable, and HTTP 503 with `status: 'error'` when it is not,
 * so orchestrators can gate traffic without affecting liveness.
 */
export interface ReadinessCheckResponse {
  status: 'ok' | 'error';
  /** Reachability of the PostgreSQL database. */
  database: DependencyStatus;
  /** ISO-8601 timestamp (UTC) at which the check ran. */
  timestamp: string;
}

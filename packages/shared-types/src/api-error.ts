/**
 * Canonical, machine-readable error codes returned by the API.
 *
 * The frontend switches on `code` (never on human-readable `message`) so that
 * copy changes never break client behavior. This enum is the shared contract
 * for the API's centralized error handling layer and maps 1:1 onto the HTTP
 * statuses the API is expected to produce.
 */
export const ApiErrorCode = {
  /** 400 / 422 — request body or params failed validation. */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** 400 — malformed request that is not a field-level validation failure. */
  BAD_REQUEST: 'BAD_REQUEST',
  /** 401 — authentication missing or invalid. */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** 403 — authenticated but not permitted. */
  FORBIDDEN: 'FORBIDDEN',
  /** 404 — resource does not exist. */
  NOT_FOUND: 'NOT_FOUND',
  /** 405 — HTTP method not allowed for this route. */
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  /** 409 — request conflicts with current resource state. */
  CONFLICT: 'CONFLICT',
  /** 413 — request payload exceeds the allowed size. */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  /** 429 — client is rate limited. */
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  /** 500+ — an unexpected server-side error. Details are never leaked. */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/**
 * The uniform error envelope every failed API response conforms to.
 */
export interface ApiErrorResponse {
  /** Stable machine-readable error code. */
  code: ApiErrorCode;
  /** Human-readable, non-leaky description safe to surface to end users. */
  message: string;
  /** HTTP status code mirrored in the body for client convenience. */
  statusCode: number;
  /** ISO-8601 timestamp of when the error was produced (UTC). */
  timestamp: string;
  /** Request path that produced the error. */
  path: string;
  /**
   * Optional field-level validation details, keyed by field path.
   * Present only for validation failures.
   */
  details?: Record<string, string[]>;
}

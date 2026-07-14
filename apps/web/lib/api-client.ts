import type {
  ApiErrorCode,
  ApiErrorResponse,
  HealthCheckResponse,
} from '@developeros/shared-types';

/**
 * Base URL of the DeveloperOS API. Exposed to the browser via a `NEXT_PUBLIC_`
 * variable; defaults to the local API port for development.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Error thrown by the API client. Preserves the shared backend error contract:
 * the machine-readable {@link ApiErrorCode}, HTTP status, and any field-level
 * validation `details`. `statusCode` is `0` for network-level failures where no
 * HTTP response was received.
 */
export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code?: ApiErrorCode;
  readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    options: { statusCode: number; code?: ApiErrorCode; details?: Record<string, string[]> },
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

/**
 * Narrows an unknown parsed body to the shared {@link ApiErrorResponse} shape.
 */
function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.code === 'string' &&
    typeof record.message === 'string' &&
    typeof record.statusCode === 'number'
  );
}

/**
 * Performs a typed GET request against the API and parses the JSON body.
 *
 * Error handling preserves the backend contract:
 *  - network failure (no response) -> ApiRequestError with `statusCode: 0`;
 *  - a well-formed {@link ApiErrorResponse} body -> ApiRequestError carrying its
 *    `code`, `message`, `statusCode`, and `details`;
 *  - a non-2xx response with a malformed/absent error body -> ApiRequestError
 *    with the HTTP status and a generic message.
 *
 * @typeParam T The expected success response body shape.
 * @param path Absolute path beginning with `/` (e.g. `/health/live`).
 */
export async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
  } catch {
    throw new ApiRequestError('Unable to reach the API', { statusCode: 0 });
  }

  if (!response.ok) {
    let parsed: unknown;
    try {
      parsed = await response.json();
    } catch {
      parsed = undefined;
    }

    if (isApiErrorResponse(parsed)) {
      throw new ApiRequestError(parsed.message, {
        statusCode: parsed.statusCode,
        code: parsed.code,
        details: parsed.details,
      });
    }

    throw new ApiRequestError(`Request failed with status ${response.status}`, {
      statusCode: response.status,
    });
  }

  return (await response.json()) as T;
}

/**
 * Fetches the API liveness status. Used by the foundation landing page to prove
 * end-to-end connectivity between the web app and the API.
 */
export function fetchHealth(): Promise<HealthCheckResponse> {
  return apiGet<HealthCheckResponse>('/health/live');
}

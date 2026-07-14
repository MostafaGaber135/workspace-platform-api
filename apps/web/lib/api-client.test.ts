import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiErrorResponse, HealthCheckResponse } from '@developeros/shared-types';
import { ApiRequestError, apiGet } from './api-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiGet', () => {
  it('returns the parsed body on a successful response', async () => {
    const payload: HealthCheckResponse = {
      status: 'ok',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: 5,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(payload, 200)),
    );

    await expect(apiGet<HealthCheckResponse>('/health/live')).resolves.toEqual(payload);
  });

  it('throws an ApiRequestError preserving the structured backend error', async () => {
    const errorBody: ApiErrorResponse = {
      code: 'CONFLICT',
      message: 'Workspace already exists',
      statusCode: 409,
      timestamp: new Date().toISOString(),
      path: '/workspaces',
      details: { name: ['must be unique per owner'] },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(errorBody, 409)),
    );

    await expect(apiGet('/workspaces')).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'Workspace already exists',
      statusCode: 409,
      code: 'CONFLICT',
      details: { name: ['must be unique per owner'] },
    });
  });

  it('falls back to a generic error for a malformed error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>Gateway Error</html>', { status: 502 })),
    );

    try {
      await apiGet('/health/live');
      expect.unreachable('apiGet should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
      const apiError = error as ApiRequestError;
      expect(apiError.statusCode).toBe(502);
      expect(apiError.code).toBeUndefined();
      expect(apiError.details).toBeUndefined();
      expect(apiError.message).toContain('502');
    }
  });

  it('throws an ApiRequestError with statusCode 0 on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    await expect(apiGet('/health/live')).rejects.toMatchObject({
      name: 'ApiRequestError',
      statusCode: 0,
    });
  });
});

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { ApiErrorCode, type ApiErrorResponse } from '@developeros/shared-types';

/**
 * Shape a handler or pipe may embed in an HttpException response body to
 * override the derived error code and attach field-level details. The global
 * ValidationpPipe / ZodValidationPipe uses this to surface structured errors.
 */
interface StructuredErrorBody {
  code?: ApiErrorCode;
  message?: string | string[];
  details?: Record<string, string[]>;
}

/**
 * Application-wide exception filter.
 *
 * Every error that escapes a handler is funneled here and serialized into the
 * single {@link ApiErrorResponse} envelope shared with the web client. It:
 *  - honors an explicit `code`/`details` embedded by validation pipes;
 *  - flattens Nest's array-form validation messages into a readable string;
 *  - maps each HTTP status to its specific {@link ApiErrorCode} (405/409/413/
 *    422/429 included) rather than collapsing everything to INTERNAL_ERROR;
 *  - preserves safe 4xx messages; and
 *  - never leaks internal details for 5xx responses.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, code, message, details } = this.normalize(exception);

    const body: ApiErrorResponse = {
      code,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(details ? { details } : {}),
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log the real error server-side, but never send its details to clients.
      this.logger.error(
        `${request.method} ${request.url} -> ${statusCode} ${code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${statusCode} ${code}`);
    }

    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string[]>;
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();

      // Any 5xx HttpException is treated as internal: scrub message and details.
      if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
        return {
          statusCode,
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'An unexpected error occurred',
        };
      }

      const structured = this.readStructuredBody(exception.getResponse());
      const code = structured.code ?? this.mapStatusToCode(statusCode);
      const message = this.flattenMessage(structured.message) ?? exception.message;
      return {
        statusCode,
        code,
        message,
        ...(structured.details ? { details: structured.details } : {}),
      };
    }

    // Unknown/unexpected error: never leak internal details to the client.
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ApiErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    };
  }

  private readStructuredBody(payload: string | object): StructuredErrorBody {
    if (typeof payload === 'string') {
      return { message: payload };
    }
    if (typeof payload !== 'object' || payload === null) {
      return {};
    }
    const record = payload as Record<string, unknown>;
    const body: StructuredErrorBody = {};

    if (typeof record.code === 'string' && this.isApiErrorCode(record.code)) {
      body.code = record.code;
    }
    if (typeof record.message === 'string') {
      body.message = record.message;
    } else if (Array.isArray(record.message)) {
      body.message = record.message.filter((item): item is string => typeof item === 'string');
    }
    if (this.isStringArrayRecord(record.details)) {
      body.details = record.details;
    }
    return body;
  }

  private flattenMessage(message: string | string[] | undefined): string | undefined {
    if (message === undefined) {
      return undefined;
    }
    if (Array.isArray(message)) {
      return message.length > 0 ? message.join('; ') : undefined;
    }
    return message;
  }

  private mapStatusToCode(statusCode: number): ApiErrorCode {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return ApiErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ApiErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ApiErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ApiErrorCode.NOT_FOUND;
      case HttpStatus.METHOD_NOT_ALLOWED:
        return ApiErrorCode.METHOD_NOT_ALLOWED;
      case HttpStatus.CONFLICT:
        return ApiErrorCode.CONFLICT;
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return ApiErrorCode.PAYLOAD_TOO_LARGE;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ApiErrorCode.VALIDATION_FAILED;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ApiErrorCode.TOO_MANY_REQUESTS;
      default:
        // Any other 4xx is a client-side bad request, not a server error.
        return ApiErrorCode.BAD_REQUEST;
    }
  }

  private isApiErrorCode(value: string): value is ApiErrorCode {
    return (Object.values(ApiErrorCode) as string[]).includes(value);
  }

  private isStringArrayRecord(value: unknown): value is Record<string, string[]> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    return Object.values(value as Record<string, unknown>).every(
      (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
    );
  }
}

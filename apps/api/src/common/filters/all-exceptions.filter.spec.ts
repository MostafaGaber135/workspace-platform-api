import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiErrorCode, type ApiErrorResponse } from '@developeros/shared-types';
import { AllExceptionsFilter } from './all-exceptions.filter';

interface CapturedResponse {
  statusCode: number;
  body: ApiErrorResponse;
}

function runFilter(exception: unknown, method = 'GET', url = '/test'): CapturedResponse {
  const captured: Partial<CapturedResponse> = {};
  const response = {
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(body: ApiErrorResponse) {
      captured.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url, method }),
    }),
  } as unknown as ArgumentsHost;

  new AllExceptionsFilter().catch(exception, host);
  return captured as CapturedResponse;
}

describe('AllExceptionsFilter', () => {
  it('maps a plain 404 to NOT_FOUND and preserves the message', () => {
    const { statusCode, body } = runFilter(new NotFoundException('Workspace not found'));
    expect(statusCode).toBe(404);
    expect(body.code).toBe(ApiErrorCode.NOT_FOUND);
    expect(body.message).toBe('Workspace not found');
    expect(body.path).toBe('/test');
    expect(body.details).toBeUndefined();
  });

  it('flattens Nest array-form validation messages', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['email must be an email', 'password too short'],
      error: 'Bad Request',
    });
    const { statusCode, body } = runFilter(exception);
    expect(statusCode).toBe(400);
    expect(body.code).toBe(ApiErrorCode.VALIDATION_FAILED);
    expect(body.message).toBe('email must be an email; password too short');
  });

  it('honors an explicit code and field-level details from the response body', () => {
    const exception = new BadRequestException({
      code: ApiErrorCode.VALIDATION_FAILED,
      message: 'Validation failed',
      details: { email: ['Enter a valid email address'] },
    });
    const { body } = runFilter(exception);
    expect(body.code).toBe(ApiErrorCode.VALIDATION_FAILED);
    expect(body.message).toBe('Validation failed');
    expect(body.details).toEqual({ email: ['Enter a valid email address'] });
  });

  it.each([
    [new UnauthorizedException(), 401, ApiErrorCode.UNAUTHORIZED],
    [new ConflictException('Already exists'), 409, ApiErrorCode.CONFLICT],
    [new PayloadTooLargeException(), 413, ApiErrorCode.PAYLOAD_TOO_LARGE],
    [
      new HttpException('Method not allowed', HttpStatus.METHOD_NOT_ALLOWED),
      405,
      ApiErrorCode.METHOD_NOT_ALLOWED,
    ],
    [
      new HttpException('Unprocessable', HttpStatus.UNPROCESSABLE_ENTITY),
      422,
      ApiErrorCode.VALIDATION_FAILED,
    ],
    [
      new HttpException('Too many', HttpStatus.TOO_MANY_REQUESTS),
      429,
      ApiErrorCode.TOO_MANY_REQUESTS,
    ],
  ])('maps status %#: %s correctly', (exception, expectedStatus, expectedCode) => {
    const { statusCode, body } = runFilter(exception);
    expect(statusCode).toBe(expectedStatus);
    expect(body.code).toBe(expectedCode);
  });

  it('maps an unrecognized 4xx to BAD_REQUEST rather than INTERNAL_ERROR', () => {
    const exception = new HttpException('Teapot', 418);
    const { statusCode, body } = runFilter(exception);
    expect(statusCode).toBe(418);
    expect(body.code).toBe(ApiErrorCode.BAD_REQUEST);
  });

  it('scrubs the message and details of a 5xx HttpException', () => {
    const exception = new InternalServerErrorException('Sensitive DB connection string leaked');
    const { statusCode, body } = runFilter(exception);
    expect(statusCode).toBe(500);
    expect(body.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    expect(body.message).toBe('An unexpected error occurred');
    expect(body.message).not.toContain('Sensitive');
    expect(body.details).toBeUndefined();
  });

  it('treats an unknown thrown value as a scrubbed 500', () => {
    const { statusCode, body } = runFilter(new Error('boom: internal stack detail'));
    expect(statusCode).toBe(500);
    expect(body.code).toBe(ApiErrorCode.INTERNAL_ERROR);
    expect(body.message).toBe('An unexpected error occurred');
  });
});

import { BadRequestException } from '@nestjs/common';
import { credentialsSchema } from '@developeros/validation';
import { ApiErrorCode } from '@developeros/shared-types';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(credentialsSchema);

  it('returns validated data for valid input, preserving email display case', () => {
    const result = pipe.transform({ email: 'Dana@Example.com', password: 'a-strong-password-1' });
    expect(result.email).toBe('Dana@Example.com');
    expect(result.password).toBe('a-strong-password-1');
  });

  it('strips unknown properties (whitelist behavior)', () => {
    const result = pipe.transform({
      email: 'dana@example.com',
      password: 'a-strong-password-1',
      isAdmin: true,
    }) as Record<string, unknown>;
    expect(result.isAdmin).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual(['email', 'password']);
  });

  it('throws a structured BadRequestException with field-level details', () => {
    expect.assertions(4);
    try {
      pipe.transform({ email: 'not-an-email', password: 'short' });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        code: string;
        details: Record<string, string[]>;
      };
      expect(response.code).toBe(ApiErrorCode.VALIDATION_FAILED);
      expect(response.details.email).toBeDefined();
      expect(response.details.password).toBeDefined();
    }
  });
});

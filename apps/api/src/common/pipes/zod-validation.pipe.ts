import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { type z, type ZodError, type ZodTypeAny } from 'zod';
import { ApiErrorCode } from '@developeros/shared-types';

/**
 * Reusable request-validation pipe backed by the shared Zod schemas
 * (`@developeros/validation`). This is the project's single, consistent
 * validation strategy — every controller that accepts input applies it as
 * `@Body(new ZodValidationPipe(schema))` (and likewise for query/params).
 *
 * Whitelisting policy: Zod object schemas only forward declared properties to
 * the handler; unknown properties are stripped (never silently trusted). A
 * schema may opt into hard rejection of unknown keys with `.strict()` where
 * that is the documented requirement.
 *
 * On failure it throws a structured 400 that the global exception filter renders
 * as a `VALIDATION_FAILED` {@link ApiErrorResponse} with field-level `details`.
 */
@Injectable()
export class ZodValidationPipe<TSchema extends ZodTypeAny>
  implements PipeTransform<unknown, z.infer<TSchema>>
{
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_FAILED,
        message: 'Validation failed',
        details: this.formatDetails(result.error),
      });
    }
    return result.data;
  }

  private formatDetails(error: ZodError): Record<string, string[]> {
    const details: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '(root)';
      const existing = details[key] ?? [];
      existing.push(issue.message);
      details[key] = existing;
    }
    return details;
  }
}

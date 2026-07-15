import { type ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { type AuthenticatedRequest } from '../types/authenticated-request';

/**
 * Resolves the current user's id from `request.user.id`.
 *
 * FAILS CLOSED: if no authenticated user is present it throws
 * `UnauthorizedException` (401, `UNAUTHORIZED` envelope via the global filter).
 * It never reads a client-controlled identity header, so workspace routes can
 * never trust a production client-supplied user id. The value of `request.user`
 * is established by authentication infrastructure (added in a later epic); for
 * now only test-only infrastructure sets it.
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const id = request.user?.id;
    if (!id) {
      throw new UnauthorizedException('Authentication required');
    }
    return id;
  },
);

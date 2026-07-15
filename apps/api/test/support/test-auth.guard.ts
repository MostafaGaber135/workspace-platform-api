import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { type AuthenticatedRequest } from '../../src/common/types/authenticated-request';

/**
 * TEST-ONLY guard. Populates `request.user` from an `x-test-user-id` header so
 * e2e tests can exercise authenticated routes without real authentication.
 *
 * This is registered ONLY inside test modules and is never part of the
 * production `AppModule`. It always returns true (it does not enforce auth); the
 * fail-closed behavior is provided by `@CurrentUserId()` when no user is set.
 */
@Injectable()
export class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers['x-test-user-id'];
    const id = Array.isArray(header) ? header[0] : header;
    if (id) {
      request.user = { id };
    }
    return true;
  }
}

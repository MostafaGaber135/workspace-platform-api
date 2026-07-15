import { type Request } from 'express';

/**
 * Express request augmented with the authenticated principal.
 *
 * `user` is optional because authentication is out of scope for this epic: no
 * production guard populates it yet. When it is absent, {@link CurrentUserId}
 * fails closed with 401. In tests, a test-only guard (never registered in the
 * production `AppModule`) populates `user`.
 */
export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

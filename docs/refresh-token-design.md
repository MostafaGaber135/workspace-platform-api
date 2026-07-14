# Refresh-token design (Phase 2 readiness)

Status: **design only — not implemented in Phase 1.** No auth endpoints exist
yet. This document records the decisions required before refresh tokens are
built so Phase 2 can implement them without redesign. It deliberately avoids
introducing abstractions ahead of need; the Phase 1 code ships only the
`TokenService`/`PasswordHasher` interfaces and their implementations.

## Goals

- Short-lived access tokens, long-lived refresh tokens.
- Refresh tokens are **revocable server-side** (stateless JWT access tokens are
  acceptable; refresh tokens must not be purely stateless).
- Stolen-token reuse is **detectable** and results in session termination.

## Token model

**Access token (JWT).** Signed with `JWT_ACCESS_SECRET`, ~15 min TTL. Claims:
`sub` (user id), `sid` (session id), `iat`, `exp`. Verified statelessly on each
request. Not stored server-side.

**Refresh token (JWT + server record).** Signed with `JWT_REFRESH_SECRET`,
~30 day TTL. Claims: `sub`, `sid` (session id), `jti` (unique token id), `iat`,
`exp`.

### `jti`

Every refresh token carries a unique `jti` (UUID). The `jti` of the _currently
valid_ refresh token for a session is persisted. Validation requires both a
valid signature **and** a `jti` that matches the stored current value for that
session. This is what makes refresh tokens revocable and reuse-detectable.

## Server-side session storage

A new `Session` table (Phase 2 migration), one row per active login session:

| Column                       | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `id`                         | Session id (`sid`).                         |
| `userId`                     | FK → `users.id`, cascade on delete.         |
| `currentJti`                 | `jti` of the currently valid refresh token. |
| `expiresAt`                  | Absolute session expiry.                    |
| `revokedAt`                  | Non-null once the session is terminated.    |
| `createdAt` / `updatedAt`    | Audit timestamps.                           |
| (optional) `userAgent`, `ip` | For session listing / audit.                |

Only the `jti` is stored, not the token string. No secret material is persisted.
This is a database table (no Redis dependency), consistent with the Architecture
Addendum's "no Redis in the MVP" decision.

## Refresh-token rotation

Refresh is **single-use with rotation**:

1. Client presents refresh token `R1` (`jti = J1`).
2. Server verifies signature, loads the session by `sid`, and checks
   `session.revokedAt IS NULL`, `expiresAt > now`, and `session.currentJti = J1`.
3. On success it issues a new access token and a new refresh token `R2`
   (`jti = J2`), sets `session.currentJti = J2`, and returns both.
4. `R1` is now stale: its `jti` no longer matches `currentJti`, so it can never
   be used again.

The rotation write (compare `currentJti`, then set the new one) must be atomic —
a conditional update (`UPDATE ... WHERE id = :sid AND currentJti = :J1`) so two
concurrent refreshes cannot both succeed.

## Token reuse detection

If a refresh request presents a **validly signed** refresh token whose `jti`
does **not** match `session.currentJti` (and the session is not already
revoked), that indicates a rotated/stolen token was replayed. Response:

- Immediately revoke the session (`revokedAt = now`), invalidating the
  attacker's and the legitimate user's refresh tokens for that session.
- Reject the request (401).
- (Optional, later) emit an audit/security event for the user.

This is the standard "refresh-token reuse ⇒ kill the session" defense.

## Logout invalidation

- **Single-session logout:** set `revokedAt = now` for that `sid`. The access
  token remains cryptographically valid until it expires (≤15 min); this window
  is accepted as the cost of stateless access tokens. If immediate access
  revocation is required later, introduce a short-TTL deny-list keyed by `sid`.
- **Global logout ("sign out everywhere"):** set `revokedAt = now` for all
  sessions where `userId = :id`.

## Access-token validation and `sid`

Because the access token carries `sid`, protected routes can optionally check
that the session is still active for sensitive operations. Routine requests
validate the access token statelessly; only refresh and sensitive actions touch
the `Session` table, keeping the hot path fast.

## What Phase 2 must add

1. `Session` model + migration.
2. `login` (create session, issue token pair), `refresh` (rotate + reuse
   detection), `logout` (revoke one), `logout-all` (revoke all).
3. Extend `TokenService` to embed/verify `sid` and `jti` (the interface already
   exists; only the claim set grows).
4. An auth guard that validates access tokens.

No part of this requires changes to the Phase 1 foundation beyond additive ones.

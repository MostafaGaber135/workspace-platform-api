/**
 * Workspace membership roles.
 *
 * Mirrors the `Role` enum persisted by the Prisma `WorkspaceMember` model.
 * In the MVP only `OWNER` is exercised (single-owner workspaces), but `MEMBER`
 * is modeled from the start so multi-member support later requires no schema or
 * type migration (see Architecture Addendum §1).
 */
export const Role = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/**
 * Type guard narrowing an arbitrary string to a known {@link Role}.
 */
export function isRole(value: string): value is Role {
  return value === Role.OWNER || value === Role.MEMBER;
}

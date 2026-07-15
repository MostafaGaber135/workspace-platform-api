import { z } from 'zod';

/** Maximum length of a workspace name (post-trim). */
export const WORKSPACE_NAME_MAX_LENGTH = 100;

/**
 * Workspace name schema: trimmed, non-empty, bounded. The original (trimmed)
 * case is preserved for display; case-insensitive uniqueness is handled
 * separately via {@link normalizeWorkspaceName}.
 */
export const workspaceNameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(1, 'Name is required')
  .max(WORKSPACE_NAME_MAX_LENGTH, `Name must be at most ${WORKSPACE_NAME_MAX_LENGTH} characters`);

/**
 * Canonical workspace-name normalization used for per-owner uniqueness.
 * Every create and rename path derives `Workspace.normalizedName` from the raw
 * name with this function; the unique constraint on `(ownerId, normalizedName)`
 * then makes "My Workspace" and "my workspace" collide for the same owner.
 */
export function normalizeWorkspaceName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Body schema for `POST /workspaces`. `.strict()` rejects unknown properties so
 * unexpected fields (e.g. a client trying to set `ownerId` or `id`) are refused
 * rather than silently ignored.
 */
export const createWorkspaceSchema = z.object({ name: workspaceNameSchema }).strict();

/**
 * Body schema for `PATCH /workspaces/:id`. Name is the only mutable field;
 * `.strict()` refuses everything else (including `ownerId`, keeping owner
 * immutable at the validation boundary).
 */
export const updateWorkspaceSchema = z.object({ name: workspaceNameSchema }).strict();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_NAME_MAX_LENGTH,
  createWorkspaceSchema,
  normalizeWorkspaceName,
  updateWorkspaceSchema,
} from './workspace.schema';

describe('normalizeWorkspaceName', () => {
  it('trims and lower-cases', () => {
    expect(normalizeWorkspaceName('  My Workspace  ')).toBe('my workspace');
  });

  it('collapses case-variants to the same value', () => {
    expect(normalizeWorkspaceName('My Workspace')).toBe(normalizeWorkspaceName('MY WORKSPACE'));
  });
});

describe('createWorkspaceSchema', () => {
  it('accepts and trims a valid name', () => {
    expect(createWorkspaceSchema.parse({ name: '  Alpha  ' })).toEqual({ name: 'Alpha' });
  });

  it('rejects an empty or whitespace-only name', () => {
    expect(createWorkspaceSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(createWorkspaceSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a name over the max length', () => {
    const tooLong = 'a'.repeat(WORKSPACE_NAME_MAX_LENGTH + 1);
    expect(createWorkspaceSchema.safeParse({ name: tooLong }).success).toBe(false);
  });

  it('rejects unknown properties (strict)', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'Alpha', ownerId: 'attacker' });
    expect(result.success).toBe(false);
  });
});

describe('updateWorkspaceSchema', () => {
  it('accepts a valid name', () => {
    expect(updateWorkspaceSchema.parse({ name: 'Beta' })).toEqual({ name: 'Beta' });
  });

  it('rejects unknown properties including ownerId (strict, owner immutable)', () => {
    expect(updateWorkspaceSchema.safeParse({ name: 'Beta', ownerId: 'x' }).success).toBe(false);
  });
});

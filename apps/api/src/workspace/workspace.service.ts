import { ConflictException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import {
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  normalizeWorkspaceName,
} from '@developeros/validation';
import { type Workspace } from '@developeros/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/** Minimal row shape needed to build a public {@link Workspace} response. */
interface WorkspaceRow {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** True when a thrown error is a Prisma unique-constraint violation (P2002). */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Workspace business logic for the Phase 2 vertical slice.
 *
 * All persistence goes directly through {@link PrismaService} (no repository
 * layer). Mutations run inside a single interactive transaction so the workspace
 * row, the explicit OWNER membership, and the audit record commit or roll back
 * together. Responses are built with {@link toResponse}, which returns only the
 * approved public fields — never `normalizedName`.
 */
@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a workspace, its explicit OWNER membership, and a WORKSPACE_CREATED
   * audit record atomically. Rolls back entirely on any failure. A duplicate
   * normalized name (per owner) yields 409 CONFLICT.
   */
  async create(ownerId: string, input: CreateWorkspaceInput): Promise<Workspace> {
    const name = input.name;
    const normalizedName = normalizeWorkspaceName(name);

    try {
      const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const clash = await tx.workspace.findFirst({
          where: { ownerId, normalizedName },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictException('A workspace with this name already exists');
        }

        const workspace = await this.insertWorkspace(tx, { ownerId, name, normalizedName });
        await this.insertOwnerMembership(tx, { workspaceId: workspace.id, userId: ownerId });
        await this.recordCreatedAudit(tx, { workspace, actorId: ownerId });
        return workspace;
      });

      return this.toResponse(created);
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  /** Lists workspaces owned by the current user, newest first. */
  async listOwnedBy(ownerId: string): Promise<Workspace[]> {
    const rows = await this.prisma.workspace.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row: WorkspaceRow) => this.toResponse(row));
  }

  /**
   * Returns a workspace the current user owns. Throws 404 when it does not exist
   * OR is owned by someone else (existence is never revealed).
   */
  async getOwned(ownerId: string, workspaceId: string): Promise<Workspace> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId },
    });
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return this.toResponse(workspace);
  }

  /**
   * Renames a workspace atomically: validates ownership (404 otherwise),
   * enforces normalized-name uniqueness (409 otherwise), updates name and
   * normalizedName, and writes a WORKSPACE_RENAMED audit record. Rolls back on
   * any failure.
   */
  async rename(
    ownerId: string,
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<Workspace> {
    const newName = input.name;
    const normalizedName = normalizeWorkspaceName(newName);

    try {
      const updated = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const current = await tx.workspace.findFirst({ where: { id: workspaceId, ownerId } });
        if (!current) {
          throw new NotFoundException('Workspace not found');
        }

        const clash = await tx.workspace.findFirst({
          where: { ownerId, normalizedName, NOT: { id: workspaceId } },
          select: { id: true },
        });
        if (clash) {
          throw new ConflictException('A workspace with this name already exists');
        }

        const next = await this.applyRename(tx, { workspaceId, name: newName, normalizedName });
        await this.recordRenamedAudit(tx, {
          workspaceId,
          actorId: ownerId,
          previousName: current.name,
          newName,
        });
        return next;
      });

      return this.toResponse(updated);
    } catch (error) {
      throw this.toWriteError(error);
    }
  }

  // --- transaction steps (kept as discrete methods so tests can force a single
  //     step to fail inside the real transaction and assert a full rollback) ---

  private insertWorkspace(
    tx: Prisma.TransactionClient,
    data: { ownerId: string; name: string; normalizedName: string },
  ): Promise<WorkspaceRow> {
    return tx.workspace.create({ data });
  }

  private insertOwnerMembership(
    tx: Prisma.TransactionClient,
    { workspaceId, userId }: { workspaceId: string; userId: string },
  ): Promise<{ id: string }> {
    // OWNER is assigned EXPLICITLY, never relying on the schema default.
    return tx.workspaceMember.create({
      data: { workspaceId, userId, role: 'OWNER' },
      select: { id: true },
    });
  }

  private applyRename(
    tx: Prisma.TransactionClient,
    {
      workspaceId,
      name,
      normalizedName,
    }: { workspaceId: string; name: string; normalizedName: string },
  ): Promise<WorkspaceRow> {
    return tx.workspace.update({ where: { id: workspaceId }, data: { name, normalizedName } });
  }

  private recordCreatedAudit(
    tx: Prisma.TransactionClient,
    { workspace, actorId }: { workspace: WorkspaceRow; actorId: string },
  ): Promise<{ id: string }> {
    return tx.auditLog.create({
      data: {
        action: 'WORKSPACE_CREATED',
        workspaceId: workspace.id,
        actorId,
        // beforeSnapshot omitted -> stored as NULL.
        afterSnapshot: this.toResponse(workspace) as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
  }

  private recordRenamedAudit(
    tx: Prisma.TransactionClient,
    {
      workspaceId,
      actorId,
      previousName,
      newName,
    }: { workspaceId: string; actorId: string; previousName: string; newName: string },
  ): Promise<{ id: string }> {
    return tx.auditLog.create({
      data: {
        action: 'WORKSPACE_RENAMED',
        workspaceId,
        actorId,
        beforeSnapshot: { name: previousName },
        afterSnapshot: { name: newName },
      },
      select: { id: true },
    });
  }

  /** Maps a row to the public contract, omitting `normalizedName` by construction. */
  private toResponse(row: WorkspaceRow): Workspace {
    return {
      id: row.id,
      name: row.name,
      ownerId: row.ownerId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Normalizes write errors: pass HTTP exceptions through; map P2002 to 409. */
  private toWriteError(error: unknown): Error {
    if (error instanceof HttpException) {
      return error;
    }
    if (isUniqueConstraintError(error)) {
      return new ConflictException('A workspace with this name already exists');
    }
    return error instanceof Error ? error : new Error('Unexpected error');
  }
}

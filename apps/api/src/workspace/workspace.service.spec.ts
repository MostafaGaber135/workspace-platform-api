import { ConflictException, NotFoundException } from '@nestjs/common';
import { type PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from './workspace.service';

const T0 = new Date('2026-07-13T12:00:00.000Z');
const T1 = new Date('2026-07-13T13:00:00.000Z');
const ISO0 = T0.toISOString();

function makeMocks() {
  const tx = {
    workspace: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    workspaceMember: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
    workspace: { findMany: jest.fn(), findFirst: jest.fn() },
  };
  const service = new WorkspaceService(prisma as unknown as PrismaService);
  return { tx, prisma, service };
}

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'w1',
  name: 'Alpha',
  normalizedName: 'alpha',
  ownerId: 'u1',
  createdAt: T0,
  updatedAt: T0,
  ...over,
});

describe('WorkspaceService.create', () => {
  it('creates workspace + explicit OWNER membership + WORKSPACE_CREATED audit, atomically', async () => {
    const { tx, prisma, service } = makeMocks();
    tx.workspace.findFirst.mockResolvedValue(null);
    tx.workspace.create.mockResolvedValue(row());
    tx.workspaceMember.create.mockResolvedValue({ id: 'm1' });
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    const result = await service.create('u1', { name: 'Alpha' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 'w1',
      name: 'Alpha',
      ownerId: 'u1',
      createdAt: ISO0,
      updatedAt: ISO0,
    });
    expect(result).not.toHaveProperty('normalizedName');

    expect(tx.workspace.create).toHaveBeenCalledWith({
      data: { ownerId: 'u1', name: 'Alpha', normalizedName: 'alpha' },
    });
    expect(tx.workspaceMember.create).toHaveBeenCalledWith({
      data: { workspaceId: 'w1', userId: 'u1', role: 'OWNER' },
      select: { id: true },
    });
    const audit = tx.auditLog.create.mock.calls[0][0];
    expect(audit.data.action).toBe('WORKSPACE_CREATED');
    expect(audit.data.beforeSnapshot).toBeUndefined();
    expect(audit.data.afterSnapshot).not.toHaveProperty('normalizedName');
    expect(audit.data.afterSnapshot).toMatchObject({ id: 'w1', name: 'Alpha', ownerId: 'u1' });
  });

  it('rejects a duplicate normalized name with 409 and never inserts', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(service.create('u1', { name: 'Alpha' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.workspace.create).not.toHaveBeenCalled();
  });

  it('maps a P2002 unique violation to 409 (race backstop)', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst.mockResolvedValue(null);
    tx.workspace.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.create('u1', { name: 'Alpha' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back (propagates, audit not reached) if membership creation fails', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst.mockResolvedValue(null);
    tx.workspace.create.mockResolvedValue(row());
    tx.workspaceMember.create.mockRejectedValue(new Error('member boom'));

    await expect(service.create('u1', { name: 'Alpha' })).rejects.toThrow('member boom');
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('rolls back (propagates) if audit creation fails', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst.mockResolvedValue(null);
    tx.workspace.create.mockResolvedValue(row());
    tx.workspaceMember.create.mockResolvedValue({ id: 'm1' });
    tx.auditLog.create.mockRejectedValue(new Error('audit boom'));

    await expect(service.create('u1', { name: 'Alpha' })).rejects.toThrow('audit boom');
  });

  it('scopes the uniqueness check to the owner (different owner may reuse a name)', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst.mockResolvedValue(null);
    tx.workspace.create.mockResolvedValue(row({ ownerId: 'u2' }));
    tx.workspaceMember.create.mockResolvedValue({ id: 'm1' });
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    await service.create('u2', { name: 'Alpha' });
    expect(tx.workspace.findFirst).toHaveBeenCalledWith({
      where: { ownerId: 'u2', normalizedName: 'alpha' },
      select: { id: true },
    });
  });
});

describe('WorkspaceService.listOwnedBy / getOwned', () => {
  it('lists only the owner rows, newest first, without normalizedName', async () => {
    const { prisma, service } = makeMocks();
    prisma.workspace.findMany.mockResolvedValue([row()]);

    const result = await service.listOwnedBy('u1');
    expect(prisma.workspace.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'u1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result[0]).not.toHaveProperty('normalizedName');
  });

  it('returns an owned workspace', async () => {
    const { prisma, service } = makeMocks();
    prisma.workspace.findFirst.mockResolvedValue(row());
    const result = await service.getOwned('u1', 'w1');
    expect(prisma.workspace.findFirst).toHaveBeenCalledWith({ where: { id: 'w1', ownerId: 'u1' } });
    expect(result.id).toBe('w1');
  });

  it('throws 404 when the workspace is missing or not owned', async () => {
    const { prisma, service } = makeMocks();
    prisma.workspace.findFirst.mockResolvedValue(null);
    await expect(service.getOwned('u1', 'other')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WorkspaceService.rename', () => {
  it('renames and writes a WORKSPACE_RENAMED audit with before/after names', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst
      .mockResolvedValueOnce(row({ name: 'Old', normalizedName: 'old' }))
      .mockResolvedValueOnce(null);
    tx.workspace.update.mockResolvedValue(
      row({ name: 'New', normalizedName: 'new', updatedAt: T1 }),
    );
    tx.auditLog.create.mockResolvedValue({ id: 'a1' });

    const result = await service.rename('u1', 'w1', { name: 'New' });

    expect(result.name).toBe('New');
    expect(tx.workspace.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: { name: 'New', normalizedName: 'new' },
    });
    const audit = tx.auditLog.create.mock.calls[0][0];
    expect(audit.data.action).toBe('WORKSPACE_RENAMED');
    expect(audit.data.beforeSnapshot).toEqual({ name: 'Old' });
    expect(audit.data.afterSnapshot).toEqual({ name: 'New' });
  });

  it('throws 404 for a workspace not owned, without updating', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst.mockResolvedValueOnce(null);
    await expect(service.rename('u1', 'w1', { name: 'New' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.workspace.update).not.toHaveBeenCalled();
  });

  it('throws 409 when the new normalized name collides with another workspace', async () => {
    const { tx, service } = makeMocks();
    tx.workspace.findFirst
      .mockResolvedValueOnce(row({ name: 'Old', normalizedName: 'old' }))
      .mockResolvedValueOnce({ id: 'w2' });
    await expect(service.rename('u1', 'w1', { name: 'Taken' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.workspace.update).not.toHaveBeenCalled();
  });
});

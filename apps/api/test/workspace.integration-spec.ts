import { normalizeEmail, normalizeWorkspaceName } from '@developeros/validation';
import { PrismaService } from '../src/prisma/prisma.service';
import { WorkspaceService } from '../src/workspace/workspace.service';

/**
 * Workspace integration test — REQUIRES A REAL POSTGRESQL.
 *
 * Exercises the real {@link WorkspaceService} against a live database through
 * {@link PrismaService} (no mocks), verifying persistence, per-owner
 * case-insensitive uniqueness, ownership scoping, and — critically — that the
 * create transaction rolls back fully when any step fails. Fails when the
 * database is unavailable. CI applies migrations with `prisma migrate deploy`
 * before running this suite.
 */
describe('Workspace integration (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const service = new WorkspaceService(prisma);
  const runId = `wsit_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const userIds: string[] = [];

  const makeUser = async (local: string): Promise<string> => {
    const email = `${runId}-${local}@Example.com`;
    const user = await prisma.user.create({
      data: { email, normalizedEmail: normalizeEmail(email), passwordHash: 'hash' },
    });
    userIds.push(user.id);
    return user.id;
  };

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // Audit FKs are RESTRICT, so audit rows must be removed before their
    // workspace/user. Then workspaces (cascades members), then users.
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.workspace.deleteMany({ where: { ownerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('creates a workspace with explicit OWNER membership and a WORKSPACE_CREATED audit', async () => {
    const owner = await makeUser('create');
    const ws = await service.create(owner, { name: 'Alpha' });

    expect(ws).toMatchObject({ name: 'Alpha', ownerId: owner });
    expect(ws).not.toHaveProperty('normalizedName');

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: ws.id, userId: owner },
    });
    expect(member?.role).toBe('OWNER');

    const audit = await prisma.auditLog.findFirst({
      where: { workspaceId: ws.id, action: 'WORKSPACE_CREATED' },
    });
    expect(audit).not.toBeNull();
    expect(audit?.beforeSnapshot).toBeNull();
    expect(audit?.afterSnapshot).toMatchObject({ id: ws.id, name: 'Alpha', ownerId: owner });
  });

  it('lists only the current user’s workspaces, newest first', async () => {
    const a = await makeUser('list-a');
    const b = await makeUser('list-b');
    await service.create(a, { name: 'A-first' });
    await service.create(a, { name: 'A-second' });
    await service.create(b, { name: 'B-only' });

    const list = await service.listOwnedBy(a);
    expect(list.map((w) => w.name)).toEqual(['A-second', 'A-first']);
    expect(list.every((w) => w.ownerId === a)).toBe(true);
  });

  it('returns an owned workspace and 404s another owner’s workspace', async () => {
    const a = await makeUser('get-a');
    const b = await makeUser('get-b');
    const ws = await service.create(a, { name: 'Owned' });

    await expect(service.getOwned(a, ws.id)).resolves.toMatchObject({ id: ws.id });
    await expect(service.getOwned(b, ws.id)).rejects.toMatchObject({ status: 404 });
  });

  it('renames a workspace and writes a WORKSPACE_RENAMED audit', async () => {
    const owner = await makeUser('rename');
    const ws = await service.create(owner, { name: 'Before' });

    const renamed = await service.rename(owner, ws.id, { name: 'After' });
    expect(renamed.name).toBe('After');

    const audit = await prisma.auditLog.findFirst({
      where: { workspaceId: ws.id, action: 'WORKSPACE_RENAMED' },
    });
    expect(audit?.beforeSnapshot).toMatchObject({ name: 'Before' });
    expect(audit?.afterSnapshot).toMatchObject({ name: 'After' });
  });

  it('rejects a duplicate normalized name for the same owner (409), case-insensitively', async () => {
    const owner = await makeUser('dup');
    await service.create(owner, { name: 'My Workspace' });
    await expect(service.create(owner, { name: 'my workspace' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('allows the same normalized name for different owners', async () => {
    const a = await makeUser('sib-a');
    const b = await makeUser('sib-b');
    await service.create(a, { name: 'Shared' });
    await expect(service.create(b, { name: 'shared' })).resolves.toMatchObject({ ownerId: b });
  });

  it('rolls back the whole transaction if membership creation fails', async () => {
    const owner = await makeUser('rb-member');
    const spy = jest
      .spyOn(
        service as unknown as { insertOwnerMembership: () => Promise<unknown> },
        'insertOwnerMembership',
      )
      .mockRejectedValueOnce(new Error('forced membership failure'));

    await expect(service.create(owner, { name: 'RollbackMember' })).rejects.toThrow(
      'forced membership failure',
    );
    spy.mockRestore();

    const normalizedName = normalizeWorkspaceName('RollbackMember');
    expect(
      await prisma.workspace.findFirst({ where: { ownerId: owner, normalizedName } }),
    ).toBeNull();
    expect(await prisma.workspaceMember.count({ where: { userId: owner } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { actorId: owner } })).toBe(0);
  });

  it('rolls back the whole transaction if audit creation fails', async () => {
    const owner = await makeUser('rb-audit');
    const spy = jest
      .spyOn(
        service as unknown as { recordCreatedAudit: () => Promise<unknown> },
        'recordCreatedAudit',
      )
      .mockRejectedValueOnce(new Error('forced audit failure'));

    await expect(service.create(owner, { name: 'RollbackAudit' })).rejects.toThrow(
      'forced audit failure',
    );
    spy.mockRestore();

    const normalizedName = normalizeWorkspaceName('RollbackAudit');
    expect(
      await prisma.workspace.findFirst({ where: { ownerId: owner, normalizedName } }),
    ).toBeNull();
    expect(await prisma.workspaceMember.count({ where: { userId: owner } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { actorId: owner } })).toBe(0);
  });
});

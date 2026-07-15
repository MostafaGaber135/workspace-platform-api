import { normalizeEmail, normalizeWorkspaceName } from '@developeros/validation';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Database integration test — REQUIRES A REAL POSTGRESQL.
 *
 * Connects through the real {@link PrismaService} (no mocks) using
 * `DATABASE_URL`, and verifies against the migrated schema:
 *  - the Prisma connection can be established (`SELECT 1`);
 *  - a user round-trips (write/read) via `normalizedEmail`;
 *  - case-variant emails collide on `normalizedEmail` (unique violation);
 *  - workspace name is unique per owner but reusable across owners;
 *  - `WorkspaceMember.role` defaults to MEMBER, and OWNER can be set explicitly.
 *
 * Fails when the database is unavailable (the `beforeAll` connect throws).
 * CI applies migrations with `prisma migrate deploy` before running this suite.
 */
describe('Database integration (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const runId = `it_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const createdUserIds: string[] = [];

  const makeUser = (local: string) => {
    const email = `${runId}-${local}@Example.com`;
    return { email, normalizedEmail: normalizeEmail(email), passwordHash: 'hash' };
  };

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  it('establishes a live connection', async () => {
    const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
    expect(rows[0]?.ok).toBe(1);
  });

  it('round-trips a user looked up by normalizedEmail', async () => {
    const data = makeUser('roundtrip');
    const created = await prisma.user.create({ data });
    createdUserIds.push(created.id);

    const found = await prisma.user.findUnique({
      where: { normalizedEmail: data.normalizedEmail },
    });
    expect(found?.id).toBe(created.id);
    // Display email retains original case; normalizedEmail is lower-cased.
    expect(found?.email).toContain('Example.com');
    expect(found?.normalizedEmail).toBe(data.normalizedEmail);
  });

  it('rejects case-variant duplicate emails via normalizedEmail uniqueness', async () => {
    const first = await prisma.user.create({ data: makeUser('case') });
    createdUserIds.push(first.id);

    // Same address, different case -> same normalizedEmail -> unique violation.
    const variantEmail = `${runId}-CASE@EXAMPLE.COM`;
    await expect(
      prisma.user.create({
        data: {
          email: variantEmail,
          normalizedEmail: normalizeEmail(variantEmail),
          passwordHash: 'hash',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('enforces unique workspace name per owner but allows it across owners', async () => {
    const ownerA = await prisma.user.create({ data: makeUser('owner-a') });
    const ownerB = await prisma.user.create({ data: makeUser('owner-b') });
    createdUserIds.push(ownerA.id, ownerB.id);

    await prisma.workspace.create({
      data: {
        name: 'Shared Name',
        normalizedName: normalizeWorkspaceName('Shared Name'),
        ownerId: ownerA.id,
      },
    });

    await expect(
      prisma.workspace.create({
        data: {
          name: 'Shared Name',
          normalizedName: normalizeWorkspaceName('Shared Name'),
          ownerId: ownerA.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    const otherOwnerWorkspace = await prisma.workspace.create({
      data: {
        name: 'Shared Name',
        normalizedName: normalizeWorkspaceName('Shared Name'),
        ownerId: ownerB.id,
      },
    });
    expect(otherOwnerWorkspace.id).toBeDefined();
  });

  it('defaults WorkspaceMember.role to MEMBER and allows explicit OWNER', async () => {
    const owner = await prisma.user.create({ data: makeUser('member-owner') });
    const other = await prisma.user.create({ data: makeUser('member-other') });
    createdUserIds.push(owner.id, other.id);
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Membership WS',
        normalizedName: normalizeWorkspaceName('Membership WS'),
        ownerId: owner.id,
      },
    });

    // Created without an explicit role -> must NOT be elevated.
    const implicit = await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: other.id },
    });
    expect(implicit.role).toBe('MEMBER');

    // Owner membership must be assigned OWNER explicitly.
    const ownerMembership = await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: owner.id, role: 'OWNER' },
    });
    expect(ownerMembership.role).toBe('OWNER');
  });
});

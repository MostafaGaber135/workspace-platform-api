# DeveloperOS

Turn real Git activity into reviewable, human-approved work logs.

This repository is a pnpm + Turborepo monorepo. **Phase 1** establishes the
engineering foundation only: the workspace, the two applications, the shared
packages, tooling, and the authentication + database foundations. No product
features are implemented yet.

## Prerequisites

- Node.js `20.11.0` (see `.nvmrc`; use `nvm use`)
- pnpm `9.x` (via `corepack enable`)
- Docker (for the local PostgreSQL instance)

## Quick start

```bash
# 1. Enable pnpm and install
corepack enable
pnpm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edit apps/api/.env and set two distinct JWT secrets (>= 32 chars each)

# 4. Generate the Prisma client and apply the schema
pnpm --filter @developeros/api prisma:generate
pnpm --filter @developeros/api prisma:migrate

# 5. Run the apps (in separate terminals)
pnpm --filter @developeros/api dev   # API on http://localhost:4000 (docs at /docs)
pnpm --filter @developeros/web dev   # Web on http://localhost:3000
```

The web landing page calls the API's liveness endpoint (`GET /health/live`),
verifying end-to-end connectivity. The API also exposes `GET /health/ready`,
which returns 200 when PostgreSQL is reachable and 503 when it is not. Liveness
is database-independent: the API starts and stays live even if PostgreSQL is
temporarily unavailable.

## Workspace layout

```
apps/
  api/               NestJS backend (config, prisma, health, auth foundation)
  web/               Next.js App Router frontend (shell + design-system foundation)
packages/
  shared-types/      Types/enums shared between web and api
  validation/        Zod schemas shared between web and api
  config/            Environment validation and shared constants
```

## Common commands (run from the root)

| Command                                   | Description                                             |
| ----------------------------------------- | ------------------------------------------------------- |
| `pnpm build`                              | Build all packages and apps (Turbo, dependency-ordered) |
| `pnpm typecheck`                          | Type-check every workspace                              |
| `pnpm lint`                               | Lint every workspace                                    |
| `pnpm test`                               | Run unit tests (Vitest for packages/web, Jest for api)  |
| `pnpm --filter @developeros/api test:e2e` | API integration tests                                   |
| `pnpm --filter @developeros/web test:e2e` | Web Playwright tests (needs browsers installed)         |
| `pnpm format`                             | Format the repository with Prettier                     |

## Conventions

- **Commits** follow Conventional Commits, enforced by commitlint via a Husky
  `commit-msg` hook. Staged files are linted and formatted on `pre-commit`.
- **TypeScript** is strict across the whole repo.
- **Environment** is validated at API startup; misconfiguration fails fast.

## Phase status

Phase 1 (foundation) is complete. Product features — repositories, evidence
collection, AI suggestions, human review, work logs, and export — are delivered
in subsequent phases per the Architecture Addendum and PRD.

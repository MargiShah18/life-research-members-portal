# AGENTS.md

## Cursor Cloud specific instructions

### Overview

WIIM (LIFE Research Institute Member Portal) is a bilingual (EN/FR) Next.js 15 + React 19 application with Ant Design UI, Prisma ORM on Microsoft SQL Server, and Microsoft Azure AD (MSAL) authentication. It is a single Next.js application (not a monorepo).

### Services

| Service | How to run | Port |
|---|---|---|
| Next.js dev server | `npm run dev` | 3000 |
| SQL Server | `sudo docker start sqlserver` (container already created) | 1433 |

### Environment variables

- `DATABASE_URL` must be set before running the dev server or Prisma commands. The local dev value is:
  `sqlserver://localhost:1433;database=wiim;user=sa;password=StrongP@ss1;trustServerCertificate=true`

### Common commands

See `package.json` scripts: `npm run dev`, `npm run build`, `npm run lint`.

- **Prisma generate:** `npx prisma generate` (run after schema changes)
- **Prisma push schema:** `DATABASE_URL=<url> npx prisma db push`

### Non-obvious caveats

- The Prisma schema targets `sqlserver` (not Postgres). A local SQL Server runs in Docker (`mcr.microsoft.com/mssql/server:2022-latest`). The container is named `sqlserver` with SA password `StrongP@ss1`.
- `npx prisma generate` does not need a live database, but `npx prisma db push` does.
- Authentication requires Azure AD / MSAL with a hardcoded client ID in `auth-config.ts`. Login flows contact `login.microsoftonline.com` and `graph.microsoft.com`; these require external internet access and a real Microsoft account. Without login, the app renders its public pages but authenticated API calls will fail.
- The Next.js build skips ESLint (configured in `next.config.js` via `eslint.ignoreDuringBuilds: true`). Run `npm run lint` separately.
- `sass` dependency version is pinned to `~1.55.0`; do not upgrade without testing SCSS compilation.
- Start the dev server with `DATABASE_URL` exported: `DATABASE_URL="sqlserver://localhost:1433;database=wiim;user=sa;password=StrongP@ss1;trustServerCertificate=true" npm run dev`

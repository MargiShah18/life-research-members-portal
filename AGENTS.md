# AGENTS.md

## Cursor Cloud specific instructions

### Overview

LIFE Research Institute (LRI) Member Portal — a bilingual (EN/FR) Next.js 15 app (Pages Router, React 19, Ant Design v5, Prisma ORM with SQL Server, Azure AD auth via MSAL).

### Services

| Service | How to run |
|---|---|
| **Next.js dev server** | `DATABASE_URL="sqlserver://localhost:1433;database=wiim;user=SA;password=DevPass123!;trustServerCertificate=true" npm run dev` (port 3000) |
| **SQL Server** | `sudo docker start sqlserver` (container already created; if missing: `sudo docker run -d --name sqlserver -e ACCEPT_EULA=Y -e "MSSQL_SA_PASSWORD=DevPass123!" -e MSSQL_PID=Developer -p 1433:1433 mcr.microsoft.com/mssql/server:2022-latest`) |

### Important notes

- **Docker daemon**: must be started before SQL Server container: `sudo dockerd &>/dev/null &` — wait a few seconds before running docker commands.
- **Prisma client**: `npx prisma generate` is needed after any `npm install` that clears `node_modules`. The update script handles this.
- **Schema sync**: `npx prisma db push` pushes the Prisma schema to the database. Required on first setup or after schema changes.
- **DATABASE_URL**: must be set as an environment variable for both `npm run dev` and any Prisma CLI commands.
- **Authentication**: the app uses Azure AD (MSAL) with a hardcoded client ID. Login redirects to `login.microsoftonline.com` — a valid Microsoft account with access to the configured Azure AD tenant is needed for full auth testing.
- **Lint**: `npm run lint` (zero warnings/errors expected).
- **Build**: `npm run build` (ESLint is skipped during build per `next.config.js`).
- **No automated tests**: the repository has no test framework or test files.

# AgentBoard

Modern operations dashboard for managing tasks and execution agents.

## Overnight Sprint Changelog (2026-02-13)

- Redesigned entire UI/UX with a polished, responsive operations dashboard.
- Added richer task creation fields (type, priority, status, owner, deadline, context, expected output).
- Upgraded API reliability with stricter validation + defensive error handling.
- Added task deletion endpoint and hooked it into UI.
- Improved agent panel with inline blocker/next-step updates.
- Restored Prisma `6.19.x` line and aligned seed/runtime usage.
- Added Dockerfile-first deployment flow for Coolify (deterministic Node `22.14.0`).
- Added production start command that runs Prisma migrations on boot.

## Architecture

- **Frontend**: Next.js App Router (`src/app/page.tsx`) + Tailwind v4 styles.
- **Backend APIs**: Next.js Route Handlers under `src/app/api`.
- **Database**: Prisma ORM using SQLite by default (`prisma/dev.db`) via `DATABASE_URL`.
- **Data model**: `Task` + `Agent` entities in `prisma/schema.prisma`.

## Environment Variables

Create `.env`:

```bash
DATABASE_URL="file:./dev.db"
```

For external DBs, provide a Prisma-compatible URL and run migrations.

## Local Development

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`.

## Quality Gate (before push/deploy)

```bash
npm run lint
npm run build
```

Then run app locally and validate:

- Task creation with all fields
- Task status transitions across columns
- Task deletion
- Agent status / blocker / next step updates
- Browser console free of runtime errors

## Docker Deployment (Coolify-ready)

This repo is now Dockerfile-based (no Nixpacks).

- Build context root: repository root
- Dockerfile: `./Dockerfile`
- Exposed port: `3000`
- Startup command (inside image): `npm run start:prod`
- On startup: `prisma migrate deploy` runs before `next start`

Build locally:

```bash
docker build -t agentboard:local .
docker run --rm -p 3000:3000 -e DATABASE_URL="file:./dev.db" agentboard:local
```

## Troubleshooting

### Prisma client errors at runtime

Run:

```bash
npx prisma generate
```

### Migration issues in production

Ensure `DATABASE_URL` is valid and reachable from container, then re-run deploy.

### App boots but no data

The app auto-seeds initial data if task table is empty. You can also run:

```bash
npm run prisma:seed
```

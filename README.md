# AgentBoard

Modern operations dashboard for managing tasks and execution agents.

## Stack

- **Frontend/API**: Next.js App Router
- **ORM**: Prisma
- **Database**: PostgreSQL (persistent)

## Environment

Create `.env`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agentboard?schema=public"
```

## Local development

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

## Production startup flow

`npm run start:prod` now does:

1. `prisma migrate deploy`
2. `prisma db seed`
3. `next start`

This guarantees schema + minimal starter data exist on each boot (idempotent).

## Starter board behavior

If task table is empty, app seeds a minimal board:

- 1 parent task: **Lancer AgentBoard en production**
- 3 subtasks linked via `parentId`

If agents table is empty, 2 default agents are inserted.

## Docker / Coolify deploy

- Build from repo root using `Dockerfile`
- Expose port `3000`
- Required env var: `DATABASE_URL` (PostgreSQL)
- Attach a persistent PostgreSQL service in Coolify and inject its connection string into app env

### Recommended Coolify steps

1. Create/attach PostgreSQL resource to the app.
2. Set `DATABASE_URL` to the resource URI (`?schema=public`).
3. Redeploy app.
4. Validate:
   - `GET /api/tasks` returns 200
   - `GET /api/agents` returns 200
   - Create a task, redeploy, verify task still exists.

## Quality gate before push/deploy

```bash
npm run lint
npm run build
```

Then smoke test locally:

- API: `/api/tasks`, `/api/agents`
- Create task and reload
- No browser console runtime errors on tested flows

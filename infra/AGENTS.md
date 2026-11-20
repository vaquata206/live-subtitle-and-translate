# infra

Dev `docker-compose` (Postgres, Redis, Mailpit, MinIO) and Dockerfiles for `apps/web` (Next.js standalone), `apps/realtime`, `apps/worker`.

- Changes here need human approval (AGENTS.md "Ask first"); propose the change and its impact instead of applying it silently.
- No secrets in Dockerfiles, compose files or images: use environment variables. Dev-only credentials (local Postgres, MinIO) must stay clearly dev-only and never be reused for staging or production.
- Pin base image versions (no `latest`); prefer multi-stage builds, a non-root user, and minimal runtime images.
- Never copy `.env*`, source maps with secrets, or dev tooling into production images. Do not bake `@lst/db` credentials into client-facing images.
- Dev compose services must bind to localhost only unless there is a documented reason.
- Verify: `corepack pnpm infra:up` starts cleanly; build the touched image locally before proposing the change.

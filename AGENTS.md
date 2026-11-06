# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. Keep it short and current; details live in `docs/` and package READMEs.

## Product

- **Chrome extension** (`apps/extension`): captures tab audio, live subtitles (Deepgram), translation, meeting minutes (LLM), DOCX export. Works fully offline/local without an account.
- **Web platform**: `apps/web` (Next.js: landing, user dashboard `/app`, viewer `/m/[slug]`, system admin `/admin`, REST `/api/v1`), `apps/realtime` (WebSocket ingest from the extension + SSE fan-out to viewers), `apps/worker` (BullMQ jobs).
- UI language: Vietnamese first, English second. User-facing strings in Vietnamese; code, comments, commit messages in English.

## Repository layout

```
apps/extension   Chrome MV3 extension (Vite)        → Chrome Web Store zip
apps/web         Next.js 16 App Router              → Docker (standalone)
apps/realtime    Fastify + ws                       → Docker
apps/worker      BullMQ                             → Docker
packages/core          shared domain logic (types, transcript, minutes pipeline, DOCX, translators, summarizers)
packages/protocol      versioned zod schemas for realtime + REST
packages/entitlements  feature catalog + entitlement resolution/guards
packages/db            SERVER-ONLY Drizzle schema/migrations
packages/ui            design system (Tailwind v4 tokens, shadcn/ui-style components, Storybook)
packages/config        shared tsconfig / eslint / prettier
infra/                 docker-compose (dev), Dockerfiles
```

## Commands (run from repo root; package manager is pnpm via corepack)

| Task                                        | Command                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Install                                     | `corepack pnpm install`                                                                        |
| Dev infra (Postgres, Redis, Mailpit, MinIO) | `corepack pnpm infra:up`                                                                       |
| All checks                                  | `corepack pnpm turbo run lint typecheck test`                                                  |
| Build everything                            | `corepack pnpm build`                                                                          |
| One workspace                               | `corepack pnpm --filter @lst/<name> <script>` (e.g. `--filter @lst/extension test`)            |
| DB migrations                               | `corepack pnpm --filter @lst/db db:generate` then `db:migrate`                                 |
| Storybook                                   | `corepack pnpm --filter @lst/ui storybook`                                                     |
| Extension zip                               | `corepack pnpm --filter @lst/extension build && corepack pnpm --filter @lst/extension package` |

## Dependency rules (enforced by ESLint `no-restricted-imports`)

- Apps never import other apps. Share code through `packages/*`.
- `apps/extension` may use only `core`, `protocol`, `entitlements`, `config`. **Never** `@lst/db`, `@lst/ui`, React or Next — server code or secrets must not end up in the extension bundle.
- `packages/core`, `protocol`, `entitlements` are isomorphic: no Node-only or DOM-only APIs at module top level, no `chrome.*`.
- `@lst/db` is server-only (`apps/web` server code, `apps/realtime`, `apps/worker`).

## Non-negotiable rules

1. **Entitlements are enforced on the server.** Every endpoint, WebSocket handshake, job or server action that exposes a plan feature must call `requireFeature(...)` / `requireQuota(...)` from `@lst/entitlements` with the resolved entitlements of the acting user, and must have a test proving the denied path. Clients (extension, web UI) only _display_ entitlements (lock icon + "Nâng cấp"); they never decide access.
2. **New feature keys** are added to `packages/entitlements/src/catalog.ts` with the most restrictive default (`false`, `0`, `[]`), then enforced and tested. Admins only assign values to plans.
3. **Protocol changes** go through `packages/protocol`. Breaking changes bump `PROTOCOL_VERSION`; the server must keep accepting `MIN_SUPPORTED_PROTOCOL` because installed extensions update late. Add tests for both versions.
4. **Never log or send to third parties**: transcripts, translations, minutes, API keys, tokens, PINs, passwords, emails. Log ids and counts only.
5. **Secrets** only in environment variables; never in code, fixtures or client bundles. Managed AI keys stay on the server; the extension only receives short-lived Deepgram tokens.
6. **Validate all input** at trust boundaries with zod schemas from `@lst/protocol` (WS frames, REST bodies, query strings).
7. **Accessibility**: WCAG 2.2 AA. Keyboard reachable, visible focus, labels for inputs, `prefers-reduced-motion` respected. Run the a11y Storybook addon / axe for new UI.
8. **i18n**: no hard-coded user-facing strings in web components once next-intl is set up (phase 2); Vietnamese is the default locale.

## Coding conventions

- TypeScript strict everywhere; prefer pure functions in `packages/*` and keep side effects at the edges.
- Tests: Vitest next to each workspace in `tests/` (`*.test.ts`); Playwright e2e in `apps/web/e2e` (`*.spec.ts`).
- Styling: Tailwind v4 utilities + tokens from `packages/ui/src/styles/globals.css`; build reusable components in `packages/ui` (shadcn/ui conventions, `cn()` helper), not inside apps.
- Commits: Conventional Commits with scopes (`feat(web): …`, `fix(extension): …`), enforced by commitlint.
- Comments only where intent is non-obvious.

## Agent tooling

Approved skills, instructions, custom agents and MCP servers are listed with sources and pinned SHAs in `.github/AGENT_TOOLING.md`. Do not add new third-party agent tooling without user approval.

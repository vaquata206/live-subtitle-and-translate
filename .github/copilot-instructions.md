# Copilot instructions

Read [AGENTS.md](../AGENTS.md) first — it is the source of truth for layout, commands, dependency rules and non-negotiable rules. Summary of what matters most:

- Monorepo (pnpm via `corepack pnpm`, Turborepo). Extension in `apps/extension`, web in `apps/web`, realtime in `apps/realtime`, jobs in `apps/worker`, shared code in `packages/*`.
- Verify changes with `corepack pnpm turbo run lint typecheck test --filter=<changed workspaces>...`.
- **Entitlements are server-enforced**: any server entry point exposing a plan feature must call `requireFeature` / `requireQuota` (`@lst/entitlements`) and have a test for the denied path. Clients only display entitlements.
- The extension must never import `@lst/db`, `@lst/ui`, React or Next; `@lst/db` is server-only.
- Realtime/REST payloads are validated with zod schemas from `@lst/protocol`; breaking protocol changes bump `PROTOCOL_VERSION` and keep the previous version working.
- Never log or forward transcripts, minutes, tokens, PINs, API keys or emails.
- User-facing text is Vietnamese-first; code and comments in English.
- UI work: use the `frontend-design`, `web-design-guidelines`, `react-best-practices`, `composition-patterns` and `shadcn` skills; build reusable components in `packages/ui` with Storybook stories; meet WCAG 2.2 AA.

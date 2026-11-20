# apps/web

Next.js 16 App Router: landing, user dashboard `/app`, viewer `/m/[slug]`, system admin `/admin`, REST `/api/v1`.

- Server vs client: keep data access, `@lst/db` and secrets in server code only (route handlers, server actions, server components). Never import `@lst/db` or server-only modules from a `"use client"` file.
- Every route handler, server action or page that exposes a plan feature calls `requireFeature` / `requireQuota` with the acting user's resolved entitlements and has a denied-path test. UI only displays entitlements (lock icon + "Nâng cấp").
- Validate all inputs (REST bodies, query strings, params, server action arguments) with zod schemas from `@lst/protocol`.
- UI: build reusable components in `packages/ui` (shadcn/ui conventions, `cn()`); use Tailwind v4 utilities and tokens from `packages/ui/src/styles/globals.css`. Do not add one-off colors or inline styles.
- User-facing strings are Vietnamese. Once next-intl is set up (phase 2), no hard-coded strings in components; Vietnamese is the default locale.
- Accessibility (WCAG 2.2 AA): keyboard reachable, visible focus, labelled inputs, `prefers-reduced-motion`. Check new UI with the Storybook a11y addon / axe.
- Performance: prefer server components; add `"use client"` only where interactivity requires it; avoid large client-side dependencies.
- Never log or expose transcripts, minutes, emails, tokens; log ids and counts only.
- E2E tests: Playwright in `apps/web/e2e` (`*.spec.ts`) using synthetic data only.
- Verify: `corepack pnpm --filter @lst/web lint typecheck test` (confirm the exact package name and scripts in `package.json`).

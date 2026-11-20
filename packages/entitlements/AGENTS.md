# packages/entitlements

- Isomorphic: no Node-only/DOM-only APIs at module top level.
- New feature keys go in `src/catalog.ts` with the most restrictive default (`false`, `0`, `[]`).
- Every new key needs: server enforcement via `requireFeature` / `requireQuota` at the call site, and a test proving the denied path.
- Do not change the meaning of existing keys or plan resolution without human approval.
- Verify: `corepack pnpm --filter @lst/entitlements test` plus tests of every app that calls the changed guard.

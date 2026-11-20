# apps/extension

- Chrome MV3, bundled with Vite. The bundle is public: no secrets, no server code.
- Allowed workspace imports: `@lst/core`, `@lst/protocol`, `@lst/entitlements`, `@lst/config` only. Never `@lst/db`, `@lst/ui`, React, Next.
- Entitlements are display-only here (lock icon + "Nâng cấp"); the server decides access.
- Only short-lived Deepgram tokens from the server; never a managed AI key.
- Works offline/local without an account; do not make core capture/subtitle flow depend on login.
- Changing permissions or host_permissions in the manifest requires human approval (store review impact).
- Verify: `corepack pnpm --filter @lst/extension lint typecheck test build`.

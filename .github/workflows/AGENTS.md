# .github/workflows

- Changes to CI need human approval (AGENTS.md "Ask first").
- Pin third-party actions to a full commit SHA (add the version as a comment). Use the least-privilege `permissions:` block per workflow/job; default to `contents: read`.
- Never print or echo secrets; never expose secrets to workflows triggered by forks. Do not use `pull_request_target` with a checkout of untrusted code.
- Use the repo commands: `corepack pnpm install --frozen-lockfile`, `corepack pnpm turbo run lint typecheck test`, `corepack pnpm build`.
- Do not weaken or skip lint, typecheck, test, commitlint or a11y checks to make CI pass; fix the cause.
- Prefer cache and concurrency settings that cancel superseded runs; keep jobs deterministic.

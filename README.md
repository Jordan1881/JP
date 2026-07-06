# JP — Job Player

Monorepo for the JP job-search tracker (Next.js frontend, Lambda API, Aurora Postgres).

## Development

```bash
pnpm install
pnpm --filter @jp/frontend dev   # http://localhost:3000
```

Copy Cognito and API env vars into `.env.local` at the repo root (see `docs/ARCHITECTURE.md`).

## Quality checks

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## End-to-end tests (Playwright)

Specs live in `Tests/e2e/`:

| Spec | Coverage |
|------|----------|
| `full-app.spec.ts` | Login, add job, search, dashboard, profile, settings, archive |
| `settings-stages.spec.ts` | Stage list drag-and-drop reorder |

**Base URL** defaults to `http://localhost:3000` (Playwright starts the dev server). Override with `E2E_BASE_URL` to smoke-test production Amplify.

**Credentials** — set `E2E_EMAIL` and `E2E_PASSWORD` for a Cognito test user. When unset, specs call `test.skip()` and the CI job exits successfully without running browsers.

```bash
# Local (Playwright starts the dev server; set JP_API_URL in .env.local)
E2E_EMAIL=you@example.com E2E_PASSWORD=secret pnpm test:e2e

# Production smoke
E2E_BASE_URL=https://main.dbkqz2plarhlv.amplifyapp.com \
  E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
```

CI runs **`e2e`** against the deployed Amplify URL when GitHub Actions secrets `E2E_EMAIL` and `E2E_PASSWORD` are configured.

## Deployment verification

After merges to `main`, follow [docs/infra/deploy-runbook.md](docs/infra/deploy-runbook.md) to confirm Amplify auto-build, AWS CDK deploy secrets, and the manual production smoke checklist.

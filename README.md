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
| `auth-login.spec.ts` | Login → finish-setup flow |
| `signup-loop.spec.ts` | No redirect loop after reload |
| `add-job.spec.ts` | Add application on home |
| `full-app.spec.ts` | Dashboard, profile, settings smoke |

**Base URL** defaults to `http://localhost:3000`. Override with `E2E_BASE_URL` (e.g. production Amplify URL for smoke tests).

**Credentials** — set `E2E_EMAIL` and `E2E_PASSWORD` for a Cognito test user. When unset, specs call `test.skip()` and CI jobs exit successfully without running browsers.

```bash
# Local (start the dev server in another terminal, or let CI start it)
E2E_EMAIL=you@example.com E2E_PASSWORD=secret pnpm test:e2e

# Production smoke
E2E_BASE_URL=https://main.dbkqz2plarhlv.amplifyapp.com \
  E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
```

CI runs `e2e-local` (starts the app via Playwright `webServer`) and `e2e-production` when GitHub Actions secrets `E2E_EMAIL`, `E2E_PASSWORD`, and (for local) `COGNITO_*` are configured.

## Deployment verification

After merges to `main`, follow [docs/infra/deploy-runbook.md](docs/infra/deploy-runbook.md) to confirm Amplify auto-build, AWS CDK deploy secrets, and the manual production smoke checklist.

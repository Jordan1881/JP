# HITL deploy runbook

Human-in-the-loop checklist for promoting JP to production. Amplify handles frontend deploys automatically; backend infra deploys from GitHub Actions on merge to `main`.

## Architecture overview

| Layer | Deploy trigger | Tool |
|-------|----------------|------|
| Frontend (Next.js) | Push to `main` | AWS Amplify (`amplify.yml`) |
| API + DB + Cognito | Push to `main` (CI `deploy-backend` job) | CDK (`Backend/infra`) |

## Prerequisites — GitHub Actions secrets

Configure in **Settings → Secrets and variables → Actions**:

| Secret | Required for | Notes |
|--------|--------------|-------|
| `AWS_ACCESS_KEY_ID` | CDK deploy | IAM user with CDK deploy permissions |
| `AWS_SECRET_ACCESS_KEY` | CDK deploy | Pair with access key |
| `AWS_REGION` | CDK deploy | e.g. `us-east-1` |
| `E2E_EMAIL` | E2E smoke (optional) | Cognito test user; jobs skip when absent |
| `E2E_PASSWORD` | E2E smoke (optional) | |
| `COGNITO_USER_POOL_ID` | Local E2E in CI (optional) | Matches Amplify env |
| `COGNITO_CLIENT_ID` | Local E2E in CI (optional) | App client ID |

When AWS secrets are missing, `deploy-backend` logs a skip message and exits 0 — safe for forks.

## Amplify environment variables

Set in **Amplify Console → App settings → Environment variables** for the `main` branch:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | CDK output `CognitoUserPoolId` |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | CDK output `CognitoClientId` |
| `JP_API_URL` | CDK output `ApiUrl` (API Gateway stage URL) |
| `ANTHROPIC_API_KEY` or secret ref | See `docs/infra/anthropic-secret.md` |

Amplify rebuilds on every merge to `main` (`amplify.yml` builds `@jp/shared-types`, `@jp/backend`, then `@jp/frontend`).

## Deploy sequence (merge to main)

1. **CI quality gate** — `pnpm lint`, `typecheck`, `test` (with Postgres service).
2. **CDK deploy** (if AWS secrets set) — updates Lambda, API Gateway, Aurora, Cognito outputs.
3. **Amplify auto-build** — triggered by GitHub webhook on push.
4. **Verify Amplify env** — confirm `JP_API_URL` matches latest `ApiUrl` output after CDK changes.
5. **Anthropic secret** — if agents fail, set key per `docs/infra/anthropic-secret.md`.

### CDK deploy (manual fallback)

```bash
export AWS_REGION=us-east-1
export CDK_DEFAULT_ACCOUNT=<account-id>
export CDK_DEFAULT_REGION=$AWS_REGION
# Optional: existing Cognito pool for authorizer hybrid mode
export COGNITO_USER_POOL_ID=us-east-1_XXXX

pnpm install
pnpm --filter @jp/shared-types build
pnpm --filter @jp/backend build
pnpm --filter @jp/infra build
pnpm --filter @jp/infra exec cdk deploy --require-approval never
```

Record outputs: `ApiUrl`, `CognitoUserPoolId`, `CognitoClientId`, `DatabaseEndpoint`.

## Post-deploy smoke checklist

Run after every production promotion:

- [ ] **Health** — `curl $JP_API_URL/health` returns `{"status":"ok",...}`
- [ ] **Amplify home** — `https://main.dbkqz2plarhlv.amplifyapp.com` loads without console errors
- [ ] **Auth** — sign in with test user; no redirect loop on reload
- [ ] **Finish setup** — new Cognito user without JP account sees “Finish your account”, completes, lands on home
- [ ] **Terms gate** — bump `CURRENT_TERMS_VERSION` in staging; user sees `/accept-terms`
- [ ] **Add job** — create application; appears in table after refresh (persistence via API proxy)
- [ ] **Profile interview** — start interview; AI step returns (requires Anthropic key)
- [ ] **E2E CI** (optional) — with `E2E_EMAIL` / `E2E_PASSWORD` secrets, `e2e-production` job passes

### Production E2E (local)

```bash
E2E_BASE_URL=https://main.dbkqz2plarhlv.amplifyapp.com \
  E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
```

## Rollback

| Component | Action |
|-----------|--------|
| Frontend | Amplify Console → redeploy previous successful build |
| Backend | `cdk deploy` previous tag or revert commit on `main` and redeploy |
| Database | Aurora PITR / snapshot restore (see `docs/infra/database.md`) |

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Jobs empty after add | `JP_API_URL` on Amplify; API Gateway authorizer + Bearer token |
| 401 on API calls | Cognito token expired; re-login; verify authorizer pool ID |
| Signup redirect loop | Account 404 vs Cognito session; see issue #53 AuthProvider |
| Agent errors | `ANTHROPIC_API_KEY` in Secrets Manager (`docs/infra/anthropic-secret.md`) |
| CDK skipped in CI | AWS secrets not configured — expected for forks |

## Human action items (#55)

Secrets must be provisioned manually before first production deploy:

1. Create IAM deploy user → add `AWS_*` secrets to GitHub.
2. Run initial `cdk deploy` (or merge to `main` with secrets set).
3. Copy CDK outputs into Amplify env vars.
4. Set Anthropic API key in Secrets Manager.
5. (Optional) Add `E2E_EMAIL` / `E2E_PASSWORD` for automated smoke tests.

# Deploy runbook — Amplify, CI, and production smoke

Use this checklist after merging to `main` to confirm users receive the new build. Automated gates (`quality`, local E2E on PRs) do not replace a quick production pass.

Production URL: **https://main.dbkqz2plarhlv.amplifyapp.com**

## 1. Amplify auto-deploy (frontend)

In [AWS Amplify Console](https://console.aws.amazon.com/amplify/) → your app → **Hosting**:

| Check | How to verify |
|-------|----------------|
| GitHub connected | Repository shows the correct `Jordan1881/JP-Job-Player` (or org) remote |
| `main` branch live | **main** is connected and **Auto-build** is enabled |
| Build after push | Within ~5 minutes of pushing `main`, a new build appears in **Deployments** |
| Commit matches | Deployment commit SHA equals the latest commit on GitHub `main` |
| Build succeeded | Status **Deployed** (not Failed/Cancelled) |

If builds do not trigger, reconnect the branch or check Amplify service role permissions on the repo.

### Amplify environment variables

Under **Hosting** → **Environment variables** (branch `main`), confirm Cognito and API settings match CDK outputs:

| Variable | Purpose |
|----------|---------|
| `JP_API_URL` | API Gateway stage URL (CDK `ApiUrl` output, trailing slash optional) |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito user pool |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito app client |
| `NEXT_PUBLIC_COGNITO_REGION` | e.g. `us-east-1` |
| `NEXT_PUBLIC_COGNITO_DOMAIN` | OAuth domain for Google sign-in (see [google-oauth.md](./google-oauth.md)) |

Agents need Anthropic credentials — see [anthropic-secret.md](./anthropic-secret.md) for `ANTHROPIC_API_KEY` or Secrets Manager wiring in Lambda (frontend only needs public Cognito IDs and `JP_API_URL`).

### Local development

1. Copy `.env.example` to `.env.local` at the **repo root** (Next.js loads it from the monorepo root).
2. Set **`JP_API_URL`** to the deployed API Gateway URL (same value as Amplify). Local `pnpm dev` does not run `@jp/backend` in-process; all `/api/*` routes proxy to Lambda.
3. Set Cognito public IDs (`NEXT_PUBLIC_COGNITO_*`) for login.
4. From repo root: `pnpm install`, then `pnpm --filter @jp/frontend dev` (or `cd Frontend && pnpm dev`).

Without `JP_API_URL`, API routes return **503** with a configuration hint.


## 2. GitHub Actions secrets (backend CDK)

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Used by |
|--------|---------|
| `AWS_ACCESS_KEY_ID` | `deploy-backend` — CDK deploy on push to `main` |
| `AWS_SECRET_ACCESS_KEY` | same |
| `AWS_REGION` | same (e.g. `us-east-1`) |

When all three are set, the **CDK deploy** step runs after `quality` passes; if any are missing, the job logs a skip and exits successfully.

Optional E2E secrets (see README E2E section):

| Secret | Used by |
|--------|---------|
| `E2E_EMAIL` / `E2E_PASSWORD` | `e2e` (production smoke against Amplify) |

## 3. Post-deploy smoke test (manual)

Run within a few minutes of a green Amplify deployment:

- [ ] Open production URL in a private/incognito window
- [ ] **Login** with a test Cognito user (finish setup if prompted)
- [ ] **Add job** from the home dashboard (title + company minimum)
- [ ] **Hard refresh** (Cmd/Ctrl+Shift+R) — job still listed with correct title/stage
- [ ] Optional: open **Profile** and **Settings** — no error toasts

### Automated production smoke

When `E2E_EMAIL` and `E2E_PASSWORD` are configured in GitHub Actions:

```bash
E2E_BASE_URL=https://main.dbkqz2plarhlv.amplifyapp.com \
  E2E_EMAIL=... E2E_PASSWORD=... pnpm test:e2e
```

The **`e2e`** CI job runs the same specs against Amplify on each workflow run (skipped when credentials are absent).

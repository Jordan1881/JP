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

Under **Hosting** → **Environment variables** (branch `main`), confirm Cognito and API settings match CDK outputs. Agents need Anthropic credentials — see [anthropic-secret.md](./anthropic-secret.md) for `ANTHROPIC_API_KEY` or Secrets Manager wiring in Lambda (frontend may only need public Cognito IDs and API base URL).

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
| `E2E_EMAIL` / `E2E_PASSWORD` | `e2e-local`, `e2e-production` |
| `COGNITO_USER_POOL_ID` / `COGNITO_CLIENT_ID` | `e2e-local` (Next.js dev server) |

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

The `e2e-production` CI job runs the same specs against Amplify on each workflow run (skipped when credentials are absent).

Local PR gate (`e2e-local`) targets `http://localhost:3000` and is separate from this production check ([#54](https://github.com/Jordan1881/JP-Job-Player/issues/54)).

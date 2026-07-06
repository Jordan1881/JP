# JP — Job Player: Technical Architecture

## Frontend

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **UI library**: React
- **Animation**: GSAP (page transitions, micro-interactions, notification bell, table row animations)
- **3D (Three.js)**: dropped from v1 — no concrete use case yet. Revisit only if a specific 3D visual (e.g., a landing-page piece) comes up; not used for core app UI.
- **Hosting**: AWS Amplify Hosting — chosen over Vercel to keep frontend and backend on a single cloud provider, one bill, one IAM/permissions model, and simpler CI/CD wiring from GitHub.

## Backend

- **Language**: TypeScript throughout (frontend and backend share one language)
- **API layer**: AWS Lambda + API Gateway (or Lambda function URLs) — serverless, pay-per-use, no server management, scales to zero when idle.
- **Database**: Aurora Serverless v2 (Postgres 15.4) — chosen over DynamoDB because the core data access patterns (keyword search, filter by stage, sort by last-updated, dashboard aggregation) are relational/SQL-shaped, not simple key-based lookups. Runs in the VPC at 0–2 ACU (min 0 enables auto-pause, eliminating the idle-capacity floor at the cost of ~15s cold-resume), reached directly from VPC-attached Lambdas with no RDS Proxy — see `docs/adr/0002-aurora-serverless-v2-no-rds-proxy.md` for the rationale.
- **Auth**: AWS Cognito — handles signup/login/password reset, integrates with the Terms-of-Use acceptance gate at signup.
- **File/static storage**: S3 — not needed for v1 (no file uploads in scope); reserved for future resume-upload (deferred to v1.1+).
- **Scheduled jobs**: EventBridge Scheduler → Lambda, for the daily Staleness Scheduler sweep (14-day stale check, repeating notifications) and the 30-day archive-deletion sweep (including the day-25 pre-deletion warning).
- **AI agents**: all three agents (Profile Interview, Cover Letter, Job-Announcement) call the Claude API through a shared Claude API Client module running in Lambda — see Feature 2 in `docs/prd/PRD.md` for the module breakdown.

## Infrastructure-as-Code

- **Tool**: AWS CDK (TypeScript) — chosen for stack-wide TypeScript consistency and real programming constructs (vs. YAML). Defines Lambda functions, the database, Cognito, EventBridge rules, and the Amplify hosting hookup as code.
- **Docker**: dropped from v1 — no server to containerize under a serverless (Lambda + Amplify) architecture. Not currently used for local dev either; revisit only if a future need arises (e.g., wanting a local Postgres container instead of a shared cloud dev database).

## CI/CD

- **Source control / CI**: GitHub + GitHub Actions — lint, typecheck, run tests, then deploy (CDK deploy for backend/infra, Amplify build for frontend).

## Repository Structure

Single monorepo (npm/pnpm workspaces), with three top-level workspaces:

```
JP-Job-Player/
├── Frontend/                  # Next.js (React, TS, GSAP)
│   ├── app/                   # Next.js App Router pages
│   ├── components/
│   └── lib/                   # API client, hooks
├── Backend/
│   ├── src/
│   │   ├── modules/           # job-repository, stage-pipeline-manager, archive-lifecycle-manager,
│   │   │                       # staleness-scheduler, notification-center,
│   │   │                       # profile-repository, user-account, profile-interview-agent,
│   │   │                       # cover-letter-agent, job-announcement-agent, claude-api-client,
│   │   │                       # user-preferences, dashboard-analytics
│   │   ├── handlers/          # Lambda entry points (API Gateway routes)
│   │   └── shared-types/      # schemas shared with Frontend via workspace reference
│   └── infra/                 # AWS CDK stacks: Lambda, Aurora/RDS Postgres, Cognito, EventBridge, Amplify
├── Tests/
│   ├── Frontend/               # mirrors Frontend/ 1:1
│   └── Backend/                # mirrors Backend/src/modules 1:1
├── docs/
│   ├── ARCHITECTURE.md         # this file
│   └── prd/PRD.md
├── .github/workflows/          # CI/CD: lint, typecheck, test, deploy
└── package.json                 # npm/pnpm workspaces root
```

**Notes:**

- Tests are kept in a dedicated top-level `Tests/` folder (rather than colocated with source) by explicit choice — structured to mirror `Frontend/` and `Backend/src/modules` 1:1 so it doesn't drift out of sync as the codebase grows.
- Shared TypeScript types (job, profile, stage schemas) live in `Backend/src/shared-types` and are imported by `Frontend` as a workspace package, so the two sides of the stack can never define conflicting shapes for the same data.
- No issue tracker connected yet — GitHub will be set up when the user is ready to start implementation.

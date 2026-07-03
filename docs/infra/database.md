# Database: schema & migrations

JP's database is Aurora Serverless v2 Postgres (see `docs/adr/0002-aurora-serverless-v2-no-rds-proxy.md`). The schema is owned by versioned migrations in `Backend/src/db/migrations/` — TypeScript modules exporting SQL, applied in order by the runner in `Backend/src/db/migrate.ts`.

## Tables (migration `0001-initial-schema`)

| Table | Shared type | Notes |
|-------|-------------|-------|
| `jobs` | `Job` | `stage_history` is jsonb (stage → ISO timestamp); status + archive-reason check constraints |
| `user_accounts` | `UserAccount` | keyed by Cognito sub; terms version + accepted-at for the consent gate |
| `career_profiles` | `CareerProfile` | `tech_stack` / `target_roles` as jsonb arrays |
| `user_preferences` | `UserPreferences` | notification toggles + custom `stage_list` (jsonb) |
| `notifications` | `AppNotification` | FK → `jobs(id)` ON DELETE CASCADE |

Indexes support the PRD list queries: jobs by user + status, sort by `last_updated_at`, filter by `current_stage`; notifications by user + `created_at`.

## Running migrations locally

Start a disposable Postgres:

```bash
docker run --rm -d --name jp-postgres \
  -e POSTGRES_USER=jp -e POSTGRES_PASSWORD=jp -e POSTGRES_DB=jp \
  -p 5432:5432 postgres:15
```

Apply migrations:

```bash
DATABASE_URL=postgres://jp:jp@localhost:5432/jp pnpm --filter @jp/backend db:migrate
```

The runner is idempotent: applied migrations are tracked in `schema_migrations` and skipped on re-run. A Postgres advisory lock serializes concurrent runners.

Connection config is resolved by `Backend/src/db/config.ts`: `DATABASE_URL` wins; otherwise the discrete `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_NAME` / `DATABASE_USER` / `DATABASE_PASSWORD` variables (the CDK stack injects host/port/name into the Lambdas). TLS is enabled for non-local hosts; set `DATABASE_SSL=false` to force-disable.

## CI

The `quality` job in `.github/workflows/ci.yml` runs a `postgres:15` service, applies migrations via `pnpm --filter @jp/backend db:migrate`, and runs the integration tests in `Tests/Backend/db/`. Those tests skip automatically when no `DATABASE_URL` / `DATABASE_HOST` is set, so plain `pnpm test` works without Docker.

## Deploy

Against the deployed Aurora cluster, migrations run from the Lambda side (wired in issue #43): the API/sweep handlers share one pool per container (ADR `0003-monolithic-api-lambda.md`) and apply pending migrations on cold start before serving traffic. Aurora auto-pause (min 0 ACU) means the first connection after idle can take ~15s to resume.

## Adding a migration

1. Create `Backend/src/db/migrations/NNNN-description.ts` exporting a `Migration` (`id` must match the filename).
2. Append it to the array in `Backend/src/db/migrations/index.ts`. Never reorder or edit already-applied migrations.
3. Verify locally against a fresh Postgres, then let CI validate on the PR.

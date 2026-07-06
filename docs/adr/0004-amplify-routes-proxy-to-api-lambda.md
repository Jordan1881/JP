# Amplify API routes proxy to the API Lambda, not to a second store

The Amplify-hosted Next.js API routes (`Frontend/app/api/**`) previously called the in-memory `getDev*()` factories directly — each serverless instance had isolated memory, which is why a job could be created on one instance and missing from the next ("job added but table empty", signup redirect loops). Two fixes were considered: (A) proxy the routes to the deployed API Gateway + `ApiHandler` Lambda, or (B) give Amplify its own Postgres connection via `DATABASE_URL`.

Chosen: **(A) proxy**. Aurora runs in the VPC with no public endpoint (ADR-0002), and Amplify Hosting compute cannot join a VPC, so (B) would require exposing the database publicly. Proxying also preserves ADR-0003's single warm connection pool — the API Lambda stays the only thing talking to Postgres.

`proxyToBackend()` in `Frontend/lib/server/backend-proxy.ts` forwards the request (path, query, body, `x-user-id`, `Authorization`) to `JP_API_URL` / `NEXT_PUBLIC_API_URL` (the API Gateway stage URL from the CDK `ApiUrl` output). API Gateway exposes a single `{proxy+}` ANY route to `ApiHandler` so every proxied path reaches the monolithic router without per-endpoint CDK updates.

**Update (#103, Option A):** Frontend API routes always proxy. There is no in-memory `@jp/backend` fallback in the Frontend package. `JP_API_URL` is **required** for local dev, Amplify, and CI E2E — routes return HTTP 503 when it is unset.

## Consequences

- Amplify and local dev need `JP_API_URL`; no VPC peering, no public database, no second pool, no `@jp/backend` in the Frontend bundle.
- The `localStorage` caches (`jobs-cache.ts`, `account-cache.ts`) are demoted to offline/network-failure fallbacks; server responses (including 404s and empty lists) are authoritative.
- Every production request pays one extra hop (Amplify → API Gateway). Acceptable at launch traffic; revisit only if latency becomes measurable.
- **Cognito JWT authorizer** on API Gateway `{proxy+}` validates ID tokens before Lambda (see `docs/infra/cognito-authorizer.md`). `proxyToBackend()` forwards `Authorization`; `getUserId()` reads `requestContext.authorizer.claims.sub`. `GET /health` stays public.

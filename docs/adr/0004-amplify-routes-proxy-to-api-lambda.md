# Amplify API routes proxy to the API Lambda, not to a second store

The Amplify-hosted Next.js API routes (`Frontend/app/api/**`) previously called the in-memory `getDev*()` factories directly — each serverless instance had isolated memory, which is why a job could be created on one instance and missing from the next ("job added but table empty", signup redirect loops). Two fixes were considered: (A) proxy the routes to the deployed API Gateway + `ApiHandler` Lambda, or (B) give Amplify its own Postgres connection via `DATABASE_URL`.

Chosen: **(A) proxy**. Aurora runs in the VPC with no public endpoint (ADR-0002), and Amplify Hosting compute cannot join a VPC, so (B) would require exposing the database publicly. Proxying also preserves ADR-0003's single warm connection pool — the API Lambda stays the only thing talking to Postgres.

`proxyOr()` in `Frontend/lib/server/backend-proxy.ts` forwards the request (path, query, body, `x-user-id`) to `JP_API_URL` / `NEXT_PUBLIC_API_URL` (the API Gateway stage URL from the CDK `ApiUrl` output). When unset — local dev — routes fall back to the in-memory dev stores, unchanged.

## Consequences

- Amplify needs one env var (`JP_API_URL`); no VPC peering, no public database, no second pool.
- The `localStorage` caches (`jobs-cache.ts`, `account-cache.ts`) are demoted to offline/network-failure fallbacks; server responses (including 404s and empty lists) are authoritative.
- Every production request pays one extra hop (Amplify → API Gateway). Acceptable at launch traffic; revisit only if latency becomes measurable.
- User identity still travels as `x-user-id` from the client. Verifying the Cognito JWT at API Gateway (authorizer) is the follow-up hardening step; the proxy forwards headers so no route changes will be needed.

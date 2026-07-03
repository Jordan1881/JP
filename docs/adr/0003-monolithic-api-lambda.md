# One monolithic API Lambda, not per-route functions

The REST API is a single Lambda (`ApiHandler`) with in-code routing, plus a separate `SweepHandler` for scheduled jobs. The database dictated the granularity: JP's Lambdas hold Postgres connection pools, and per-route functions would give every route its own pool, multiplying idle connections against Aurora's small `max_connections` at low ACU. One function means one warm pool, fewer cold starts across the API, and one deploy unit.

## Consequences

- Contrast with Finlens (per-route functions): DynamoDB is stateless HTTP with no pools, so splitting there bought per-function least-privilege IAM instead. Granularity follows state.
- The sweep job stays a separate function because its trigger (EventBridge), timeout, and permissions differ from the API's.
- If route count or blast-radius concerns grow, splitting later is mechanical — routing already lives in application code behind one entry point.

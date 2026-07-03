# Aurora Serverless v2, direct Lambda connections, no RDS Proxy

The database is Aurora Serverless v2 Postgres (resolving ARCHITECTURE.md's open "RDS or Aurora" question), reached directly from VPC-attached Lambdas — no RDS Proxy and no Data API. Proxy was considered and rejected on cost: its ~8-ACU minimum (~$85/month) exceeds the database's own cost to solve a connection-storm problem that doesn't exist at launch traffic. One pooled client per Lambda container suffices at low concurrency.

## Consequences

- RDS Proxy is the documented upgrade path once concurrent executions approach Aurora's `max_connections` at the configured ACU floor.
- Known idle floor: minCapacity 0.5 ACU (~$44/mo) plus the NAT gateway (~$32/mo). Decision: set `serverlessV2MinCapacity: 0` for auto-pause, accepting ~15s cold-resume, until real traffic justifies a warm floor.

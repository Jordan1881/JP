import pg from "pg";
import { resolveDatabaseConfig, type DatabaseConfig } from "./config.js";

/**
 * One pool per Lambda container (ADR-0003: single monolithic ApiHandler owns
 * the only warm pool). Small max because Aurora Serverless v2 at a low ACU
 * floor has a small max_connections budget (ADR-0002: no RDS Proxy).
 */
export function createPool(config: DatabaseConfig): pg.Pool {
  return new pg.Pool({
    ...config,
    max: 5,
    idleTimeoutMillis: 30_000,
    // Aurora auto-pause resume can take ~15s (ADR-0002); leave headroom.
    connectionTimeoutMillis: 30_000,
  });
}

let sharedPool: pg.Pool | null = null;

/** Module-level pool shared across warm invocations; null when no DB is configured. */
export function getSharedPool(): pg.Pool | null {
  if (sharedPool) {
    return sharedPool;
  }
  const config = resolveDatabaseConfig();
  if (!config) {
    return null;
  }
  sharedPool = createPool(config);
  return sharedPool;
}

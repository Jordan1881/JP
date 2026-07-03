export interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: { rejectUnauthorized: boolean };
}

/**
 * Resolve Postgres connection config from the environment.
 *
 * Precedence: DATABASE_URL wins; otherwise the discrete DATABASE_* variables
 * that the CDK stack injects into the Lambdas (host/port/name) plus
 * DATABASE_USER / DATABASE_PASSWORD (from Secrets Manager, wired in the
 * Lambda bootstrap). Returns null when nothing is configured, which callers
 * treat as "no database — use in-memory stores".
 */
export function resolveDatabaseConfig(
  env: NodeJS.ProcessEnv = process.env,
): DatabaseConfig | null {
  if (env.DATABASE_URL) {
    return {
      connectionString: env.DATABASE_URL,
      ssl: env.DATABASE_SSL === "false" ? undefined : sslFor(env.DATABASE_URL),
    };
  }

  if (env.DATABASE_HOST) {
    return {
      host: env.DATABASE_HOST,
      port: env.DATABASE_PORT ? Number(env.DATABASE_PORT) : 5432,
      database: env.DATABASE_NAME ?? "jp",
      user: env.DATABASE_USER,
      password: env.DATABASE_PASSWORD,
      ssl:
        env.DATABASE_SSL === "false"
          ? undefined
          : { rejectUnauthorized: false },
    };
  }

  return null;
}

function sslFor(url: string): { rejectUnauthorized: boolean } | undefined {
  // Local connections don't use TLS; Aurora requires it.
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

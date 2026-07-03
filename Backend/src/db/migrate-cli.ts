import { resolveDatabaseConfig } from "./config.js";
import { createPool } from "./pool.js";
import { runMigrations } from "./migrate.js";
import { migrations } from "./migrations/index.js";

async function main(): Promise<void> {
  const config = resolveDatabaseConfig();
  if (!config) {
    console.error(
      "No database configured. Set DATABASE_URL (or DATABASE_HOST/DATABASE_PORT/DATABASE_NAME/DATABASE_USER/DATABASE_PASSWORD).",
    );
    process.exitCode = 1;
    return;
  }

  const pool = createPool(config);
  try {
    const result = await runMigrations(pool, migrations);
    for (const id of result.skipped) {
      console.log(`skipped (already applied): ${id}`);
    }
    for (const id of result.applied) {
      console.log(`applied: ${id}`);
    }
    if (result.applied.length === 0) {
      console.log("Database schema is up to date.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

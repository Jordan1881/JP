import type { Migration } from "../migrate.js";
import { initialSchema } from "./0001-initial-schema.js";

/** All migrations, in apply order. Append only — never reorder or edit applied entries. */
export const migrations: Migration[] = [initialSchema];

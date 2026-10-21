// Prisma 7 CLI configuration (architecture §12.4). Loads .env.local explicitly; variables already set in
// the process (e.g. by the integration harness) win, because dotenv does not override by default.
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local", quiet: true });

// Migrations use the direct (non-pooled) connection when one is configured.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL; // empty strings count as unset

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(url ? { datasource: { url } } : {}),
});

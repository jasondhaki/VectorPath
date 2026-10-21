// npm run db:size — measured database/extension/index storage against the 150 MB budget (architecture §12.4).
// Run with the react-server condition so lib/db's server-only guard resolves outside Next.js.
import { config } from "dotenv";
import { getDb } from "@/lib/db/client";
import { SIZE_BUDGET_BYTES, measureSize } from "@/lib/db/size";

config({ path: ".env.local", quiet: true });

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

const db = getDb();
try {
  const report = await measureSize(db);
  console.log(`Database ${report.database}: ${mb(report.databaseBytes)} (budget ${mb(SIZE_BUDGET_BYTES)})`);
  console.log(`Extensions: ${report.extensions.map((e) => `${e.name} ${e.version}`).join(", ")}`);
  console.log(`Vector (hnsw/ivfflat) indexes: ${mb(report.vectorIndexBytes)}`);
  console.log("Relation                       table        indexes      total");
  for (const r of report.relations) {
    console.log(`${r.name.padEnd(30)} ${mb(r.tableBytes).padStart(10)} ${mb(r.indexBytes).padStart(12)} ${mb(r.totalBytes).padStart(10)}`);
  }
  if (report.databaseBytes > SIZE_BUDGET_BYTES) {
    console.error(`OVER BUDGET: ${mb(report.databaseBytes)} > ${mb(SIZE_BUDGET_BYTES)}`);
    process.exitCode = 1;
  }
} finally {
  await db.$disconnect();
}

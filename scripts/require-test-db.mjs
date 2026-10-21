// Integration/E2E database gate: fail clearly instead of silently skipping (code-standards §9).
// Like tests/setup/integration-db.ts, read .env.local if present (Node's loader never overrides variables already
// set and prints nothing). Isolation itself is enforced later by the harness guard, not here.
try {
  process.loadEnvFile(".env.local");
} catch (e) {
  if (e?.code !== "ENOENT") throw e;
}
if (!process.env.TEST_DATABASE_URL) {
  console.error("BLOCKED: TEST_DATABASE_URL is not set. Integration tests need an isolated database (U03).\n" +
    "Start the local test database and set TEST_DATABASE_URL in .env.local — see README.md.");
  process.exit(1);
}

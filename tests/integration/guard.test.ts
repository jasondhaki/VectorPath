import { describe, expect, it } from "vitest";
import { assertIsolatedTestTarget } from "../setup/integration-db";

// R3-10: the destructive harness refuses anything not verifiably the isolated test database.
const OK = "postgresql://vectorpath:pw@127.0.0.1:55433/vectorpath_test";

describe("assertIsolatedTestTarget", () => {
  it("accepts a loopback _test database distinct from the runtime targets", () => {
    expect(assertIsolatedTestTarget(OK, ["postgresql://u:p@127.0.0.1:55432/vectorpath", undefined])).toBe(OK);
    expect(assertIsolatedTestTarget("postgres://u:p@localhost/app_test", [])).toBe("postgres://u:p@localhost/app_test");
    expect(assertIsolatedTestTarget("postgresql://u:p@[::1]:5432/app_test", [])).toBeTruthy();
  });

  it.each([
    ["unset", undefined],
    ["empty", ""],
    ["not a URL", "vectorpath_test"],
    ["non-postgres scheme", "mysql://u:p@127.0.0.1/app_test"],
    ["remote host", "postgresql://u:p@ep-cool.ap-southeast-1.aws.neon.tech/app_test"],
    ["private network host", "postgresql://u:p@10.0.0.5/app_test"],
    ["name without _test suffix", "postgresql://u:p@127.0.0.1:55433/vectorpath"],
    ["test as prefix only", "postgresql://u:p@127.0.0.1:55433/test_vectorpath"],
    ["production-looking name", "postgresql://u:p@127.0.0.1:55433/production"],
  ])("refuses %s", (_label, url) => {
    expect(() => assertIsolatedTestTarget(url, [])).toThrow(/^REFUSED/);
  });

  it("accepts only allowlisted query parameters (schema, sslmode, connect_timeout)", () => {
    const url = `${OK}?schema=public&sslmode=disable&connect_timeout=5`;
    expect(assertIsolatedTestTarget(url, [])).toBe(url);
    expect(assertIsolatedTestTarget(`${OK}?SSLMODE=disable`, [])).toBeTruthy();
  });

  // U03 review #1: pg-connection-string lets query parameters override the URL host/port/database.
  it.each([
    ["?host= remote override", `${OK}?host=ep-x.ap-southeast-1.aws.neon.tech`],
    ["?host= with ?port=", `${OK}?host=ep-x.neon.tech&port=5432`],
    ["?port= override", `${OK}?port=5432`],
    ["?hostaddr= override", `${OK}?hostaddr=10.0.0.5`],
    ["?dbname= override", `${OK}?dbname=production`],
    ["unix-socket ?host=", `${OK}?host=/var/run/postgresql`],
    ["upper-case ?HOST=", `${OK}?HOST=ep-x.neon.tech`],
    ["mixed-case ?Host=", `${OK}?Host=ep-x.neon.tech`],
    ["?service=", `${OK}?service=prod`],
    ["?options=", `${OK}?options=-c%20search_path%3Dprod`],
    ["allowed param followed by host", `${OK}?sslmode=disable&host=ep-x.neon.tech`],
  ])("refuses %s", (_label, url) => {
    expect(() => assertIsolatedTestTarget(url, [])).toThrow(/^REFUSED: TEST_DATABASE_URL query parameter/);
  });

  it("compares against the effective target of the other URLs, honouring their host/port/dbname parameters", () => {
    expect(() => assertIsolatedTestTarget(OK, ["postgresql://u:p@db.example.com/x?host=localhost&port=55433&dbname=vectorpath_test"])).toThrow(/same database/);
  });

  it("refuses a test URL that targets the same database as DATABASE_URL or DIRECT_URL", () => {
    expect(() => assertIsolatedTestTarget(OK, ["postgresql://other:x@localhost:55433/vectorpath_test"])).toThrow(/same database/);
    expect(() => assertIsolatedTestTarget(OK, [undefined, OK])).toThrow(/same database/);
  });

  it("never echoes credentials in refusal messages", () => {
    try {
      assertIsolatedTestTarget("postgresql://u:supersecret@db.example.com/x", []);
      expect.unreachable();
    } catch (error) {
      expect(String(error)).not.toContain("supersecret");
    }
  });
});

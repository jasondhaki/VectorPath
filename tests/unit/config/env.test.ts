import { describe, expect, it } from "vitest";
import { parseEnv, resolveModelMode } from "@/lib/config/env";

describe("resolveModelMode (GEMINI_TIER switch)", () => {
  const mode = (vars: Record<string, string>) => resolveModelMode(parseEnv(vars));

  it("defaults to the local engine with no model calls", () => {
    expect(mode({})).toEqual({ personal: "local", general: "disabled" });
  });

  it("keeps personal tasks local on the unpaid tier even with a key in live mode", () => {
    expect(mode({ LLM_MODE: "live", CV_ANALYZE_DAILY_CAP: "50", GEMINI_API_KEY: "k" })).toEqual({ personal: "local", general: "gemini" });
  });

  it("unlocks paid personal processing only with tier, key and live mode together", () => {
    const live = { LLM_MODE: "live", CV_ANALYZE_DAILY_CAP: "50" };
    expect(mode({ ...live, GEMINI_TIER: "paid", GEMINI_API_KEY: "k" }).personal).toBe("gemini-paid");
    expect(mode({ ...live, GEMINI_TIER: "paid" }).personal).toBe("local");
    expect(mode({ GEMINI_TIER: "paid", GEMINI_API_KEY: "k" }).personal).toBe("local");
  });
});

describe("parseEnv guard rails", () => {
  it("fails closed in live mode without a daily analysis cap", () => {
    expect(() => parseEnv({ LLM_MODE: "live" })).toThrow(/CV_ANALYZE_DAILY_CAP/);
  });

  it("rejects Adzuna caps above the owner limits and non-768 embeddings", () => {
    expect(() => parseEnv({ ADZUNA_LIMIT_MINUTE: "10000" })).toThrow(/ADZUNA_LIMIT_MINUTE/);
    expect(() => parseEnv({ ADZUNA_LIMIT_DAY: "201" })).toThrow(/ADZUNA_LIMIT_DAY/);
    expect(() => parseEnv({ ADZUNA_LIMIT_WEEK: "901" })).toThrow(/ADZUNA_LIMIT_WEEK/);
    expect(() => parseEnv({ ADZUNA_LIMIT_MONTH: "2301" })).toThrow(/ADZUNA_LIMIT_MONTH/);
    expect(parseEnv({ ADZUNA_LIMIT_DAY: "50" }).ADZUNA_LIMIT_DAY).toBe(50);
    expect(() => parseEnv({ EMBEDDING_DIM: "1536" })).toThrow(/EMBEDDING_DIM/);
  });
});

describe("parseEnv", () => {
  it("applies safe defaults: fixtures, mock, personal processing off", () => {
    const env = parseEnv({});
    expect(env.DATA_MODE).toBe("fixtures");
    expect(env.LLM_MODE).toBe("mock");
    expect(env.PERSONAL_LLM_ENABLED).toBe(false);
    expect(env.EMBEDDING_DIM).toBe(768);
  });

  it("treats empty strings as unset", () => {
    expect(parseEnv({ GROQ_API_KEY: "", DATA_MODE: "" }).GROQ_API_KEY).toBeUndefined();
  });

  it("names the invalid variable without echoing its value", () => {
    expect(() => parseEnv({ DATA_MODE: "s3cret-value" })).toThrow(/DATA_MODE/);
    expect(() => parseEnv({ DATA_MODE: "s3cret-value" })).not.toThrow(/s3cret/);
  });
});

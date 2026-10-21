import "server-only";
import { z } from "zod";

const flag = z.enum(["true", "false"]).default("false").transform((v) => v === "true");
const optional = z.string().min(1).optional();

export const envSchema = z.object({
  DATABASE_URL: optional,
  DIRECT_URL: optional,
  TEST_DATABASE_URL: optional,
  SESSION_SECRET: optional,
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
  DATA_MODE: z.enum(["live", "fixtures"]).default("fixtures"),
  LLM_MODE: z.enum(["live", "mock"]).default("mock"),
  PERSONAL_LLM_ENABLED: flag,
  LLM_PERSONAL_PROVIDER: optional,
  LLM_PERSONAL_MODEL: optional,
  GROQ_API_KEY: optional,
  GEMINI_TIER: z.enum(["unpaid", "paid"]).default("unpaid"),
  GEMINI_API_KEY: optional,
  LLM_GENERAL_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  // Database columns are vector(768); any other dimension needs re-embedding and a migration (I13).
  EMBEDDING_DIM: z.coerce.number().pipe(z.literal(768)).default(768),
  EMBEDDING_TASK_TYPE: z.string().min(1).default("SEMANTIC_SIMILARITY"),
  ADZUNA_APP_ID: optional,
  ADZUNA_APP_KEY: optional,
  // Hard owner caps (architecture §12.5); configuration may only lower them.
  ADZUNA_LIMIT_MINUTE: z.coerce.number().int().nonnegative().max(20).default(20),
  ADZUNA_LIMIT_DAY: z.coerce.number().int().nonnegative().max(200).default(200),
  ADZUNA_LIMIT_WEEK: z.coerce.number().int().nonnegative().max(900).default(900),
  ADZUNA_LIMIT_MONTH: z.coerce.number().int().nonnegative().max(2300).default(2300),
  LIGHTCAST_CLIENT_ID: optional,
  LIGHTCAST_CLIENT_SECRET: optional,
  CV_ANALYZE_DAILY_CAP: z.coerce.number().int().positive().optional(),
}).superRefine((env, ctx) => {
  // Live model processing fails closed without a global analysis cap (CLAUDE.md §6).
  if (env.LLM_MODE === "live" && env.CV_ANALYZE_DAILY_CAP === undefined) {
    ctx.addIssue({ code: "custom", path: ["CV_ANALYZE_DAILY_CAP"], message: "required when LLM_MODE=live" });
  }
});

export type Env = z.infer<typeof envSchema>;

/** Parses an environment record; empty strings count as unset. Errors name variables, never values. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ""));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const names = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${names}`);
  }
  return result.data;
}

export type ModelMode = {
  /** Personal tasks (CV/JD extraction, explanations, advisor): paid Gemini or the deterministic local engine. */
  personal: "gemini-paid" | "local";
  /** Public, non-personal offline tasks (seed embeddings, public outlook drafts). */
  general: "gemini" | "disabled";
};

/** The single GEMINI_TIER switch (architecture §12.1). Paid personal processing needs tier, key and live mode together. */
export function resolveModelMode(env: Env): ModelMode {
  const live = env.LLM_MODE === "live" && env.GEMINI_API_KEY !== undefined;
  return {
    personal: live && env.GEMINI_TIER === "paid" ? "gemini-paid" : "local",
    general: live ? "gemini" : "disabled",
  };
}

let cached: Env | undefined;
export function getEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

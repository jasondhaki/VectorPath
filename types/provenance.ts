import { z } from "zod";

// Four provenance categories kept distinct end to end (architecture_astra.md §3, I04).

export const DataModeSchema = z.enum(["live", "cached", "recorded-fixture"]);

export const ObservedFactSchema = z.object({
  kind: z.literal("observed"),
  provider: z.string().min(1),
  sourceVersion: z.string().min(1),
  sourceUrl: z.url(),
  licenseId: z.string().min(1),
  fetchedAt: z.iso.datetime(),
  observedPeriod: z.string().min(1).nullable(),
  unit: z.string().min(1).nullable(),
  /** ISO 4217 code for monetary values; null otherwise. */
  currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
  mode: DataModeSchema,
});

export const DerivedEstimateSchema = z.object({
  kind: z.literal("estimate"),
  calculationVersion: z.string().min(1),
  computedAt: z.iso.datetime(),
  sourceFactIds: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  support: z.enum(["High", "Medium", "Low"]),
});

export const ProjectionSchema = z.object({
  kind: z.literal("projection"),
  scenario: z.string().min(1),
  horizon: z.string().min(1),
  generationVersion: z.string().min(1),
  supportingFactIds: z.array(z.string().min(1)).min(1),
  confidence: z.enum(["High", "Medium", "Low"]),
});

export const UnavailableReasonSchema = z.enum([
  "unsupported-region",
  "no-source",
  "permission-unavailable",
  "quota-exhausted",
  "stale-beyond-policy",
  "unknown-requirement",
]);

export const UnavailableSchema = z.object({
  kind: z.literal("unavailable"),
  reason: UnavailableReasonSchema,
});

export const ProvenanceSchema = z.discriminatedUnion("kind", [
  ObservedFactSchema,
  DerivedEstimateSchema,
  ProjectionSchema,
  UnavailableSchema,
]);

export type ObservedFact = z.infer<typeof ObservedFactSchema>;
export type DerivedEstimate = z.infer<typeof DerivedEstimateSchema>;
export type Projection = z.infer<typeof ProjectionSchema>;
export type Unavailable = z.infer<typeof UnavailableSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;

import { z } from "zod";

// Scoring contracts v1 (architecture_astra.md §7). All internal components are in [0,1];
// 0–100 display rounding happens only in presentation.

const unit = z.number().finite().min(0).max(1);
const positiveUnit = z.number().finite().gt(0).max(1);
const nonNegative = z.number().finite().min(0);

/** Namespaced canonical ID, e.g. "onet:2.A.1.a", "lightcast:KS1200364C9C1LK3V5Q1", "onet-sw:43232408". */
export const CanonicalIdSchema = z.string().regex(/^[a-z][a-z0-9-]*:.+$/);

export const RequirementKindSchema = z.enum(["descriptor", "software"]);
/** Drives plan grouping and default uncovered hours (§7.3: software 20, knowledge 30, essential 15, transferable 15). */
export const RequirementCategorySchema = z.enum(["essential", "transferable", "knowledge", "software"]);

/** A normalized, deduplicated, positively weighted role requirement (§7.1). */
export const ScoredRequirementSchema = z
  .object({
    id: CanonicalIdSchema,
    kind: RequirementKindSchema,
    category: RequirementCategorySchema,
    /** ≥0.50: descriptors are included only at normalized importance ≥0.50; software weight is 0.50 + 0.25·hot + 0.25·inDemand. */
    weight: z.number().finite().min(0.5).max(1),
    requiredLevel: positiveUnit,
    sourceRefs: z.array(z.string().min(1)).min(1),
  })
  .refine((r) => (r.kind === "software") === (r.category === "software"), {
    message: "software kind and software category go together",
  });

/** Effective accepted user level for one canonical skill/descriptor, already resolved (override > max evidence/inference). */
export const UserSkillLevelSchema = z.object({ id: CanonicalIdSchema, level: unit });

/** Approved software neighbor (similarity ≥ 0.80 is enforced by the domain, not the contract). */
export const SkillNeighborSchema = z.object({ fromId: CanonicalIdSchema, toId: CanonicalIdSchema, similarity: unit });

export const CoverageStateSchema = z.enum(["have", "partial", "transferable", "to-build"]);

export const RequirementCoverageSchema = z
  .object({
    requirementId: CanonicalIdSchema,
    direct: unit,
    neighbor: unit,
    effective: unit,
    state: CoverageStateSchema,
    neighborVia: CanonicalIdSchema.nullable(),
  })
  .refine((c) => c.effective === Math.max(c.direct, c.neighbor), { message: "effective must equal max(direct, neighbor) (§7.2)" });

export const FitBreakdownSchema = z.object({
  fit: unit,
  fitDesc: unit.nullable(),
  fitTools: unit.nullable(),
  alpha: unit.nullable(),
  coverages: z.array(RequirementCoverageSchema),
});

/** Shared workload contract (U16 produces; Reach, plans and graph edges consume) — §7.3. */
export const WorkloadResourceItemSchema = z.object({
  resourceId: z.string().min(1),
  resourceHours: nonNegative,
  residual: unit,
  hours: nonNegative,
  servesRequirementIds: z.array(CanonicalIdSchema).min(1),
});
export const WorkloadUncoveredItemSchema = z.object({
  requirementId: CanonicalIdSchema,
  category: RequirementCategorySchema,
  defaultHours: nonNegative,
  residual: unit,
  hours: nonNegative,
});
export const WorkloadBreakdownSchema = z.object({
  totalHours: nonNegative,
  weeklyHours: z.number().finite().min(1).max(40),
  weeks: nonNegative,
  resourceItems: z.array(WorkloadResourceItemSchema),
  uncoveredItems: z.array(WorkloadUncoveredItemSchema),
});

export const ReachBreakdownSchema = z
  .object({
    reach: unit,
    weeks: nonNegative,
    zoneGap: z.number().int().min(0).nullable(),
    /** False when either zone is unknown: zero penalty plus a visible unknown-preparation warning. */
    zoneKnown: z.boolean(),
    longReach: z.boolean(),
  })
  .refine((r) => (r.zoneGap === null) === !r.zoneKnown, { message: "zoneGap is null exactly when the zone is unknown" });

export const SupportLevelSchema = z.enum(["High", "Medium", "Low"]);

export const DemandBreakdownSchema = z.object({
  demand: unit,
  percentile: unit.nullable(),
  cohortSize: z.number().int().min(0).nullable(),
  macro: unit.nullable(),
  sectorYears: z.array(z.number().int()),
  forecastApplied: z.boolean(),
  support: SupportLevelSchema,
  /** True only for the neutral 0.5 prior: "No market data", not measured demand. */
  noMarketData: z.boolean(),
  /** Market snapshots behind P; snapshotDate drives the ≤7-day High support rule (§7.4). */
  snapshotIds: z.array(z.string().min(1)),
  snapshotDate: z.iso.date().nullable(),
  /** World Bank GEP vintage when forecastApplied (§3, §10). */
  forecastVintage: z.string().min(1).nullable(),
});

export const OpportunityResultSchema = z.object({
  scoringVersion: z.string().min(1),
  soc: z.string().min(1),
  opportunity: z.number().finite().min(0).max(100),
  fit: FitBreakdownSchema,
  reach: ReachBreakdownSchema,
  demand: DemandBreakdownSchema,
});

export type CanonicalId = z.infer<typeof CanonicalIdSchema>;
export type RequirementCategory = z.infer<typeof RequirementCategorySchema>;
export type ScoredRequirement = z.infer<typeof ScoredRequirementSchema>;
export type UserSkillLevel = z.infer<typeof UserSkillLevelSchema>;
export type SkillNeighbor = z.infer<typeof SkillNeighborSchema>;
export type CoverageState = z.infer<typeof CoverageStateSchema>;
export type RequirementCoverage = z.infer<typeof RequirementCoverageSchema>;
export type FitBreakdown = z.infer<typeof FitBreakdownSchema>;
export type WorkloadBreakdown = z.infer<typeof WorkloadBreakdownSchema>;
export type ReachBreakdown = z.infer<typeof ReachBreakdownSchema>;
export type DemandBreakdown = z.infer<typeof DemandBreakdownSchema>;
export type OpportunityResult = z.infer<typeof OpportunityResultSchema>;

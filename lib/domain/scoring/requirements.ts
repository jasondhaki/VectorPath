import type { CanonicalId, RequirementCategory, ScoredRequirement } from "@/types/scoring";
import { WEIGHTS, clamp01 } from "./weights";

// §7.1 role requirement normalization and user-level resolution. Pure; inputs are already-parsed rows.

/** PROVISIONAL (R3-2, until U15 lock). The verified source scale of a raw value (e.g. O*NET importance 1–5, level 0–7). */
export interface SourceScale {
  min: number;
  max: number;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface DescriptorRow {
  id: CanonicalId;
  category: Exclude<RequirementCategory, "software">;
  importance: number | null;
  importanceScale: SourceScale;
  level: number | null;
  levelScale: SourceScale;
  /** Source suppression / not-relevant / unusable flag. */
  suppressed: boolean;
  sourceRef: string;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface SoftwareRow {
  id: CanonicalId;
  hot: boolean;
  inDemand: boolean;
  sourceRef: string;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export type RoleRequirementSet =
  | { kind: "scorable"; requirements: ScoredRequirement[] }
  | { kind: "unscorable"; reason: "no-usable-requirements" };

/** (value − min)/(max − min) clamped to [0,1]; null for missing value or a degenerate/non-finite scale. */
export function normalizeOnScale(value: number | null, scale: SourceScale): number | null {
  if (value === null || !Number.isFinite(value) || !Number.isFinite(scale.min) || !Number.isFinite(scale.max)) return null;
  if (scale.max <= scale.min) return null;
  return clamp01((value - scale.min) / (scale.max - scale.min));
}

/** A descriptor contributes only when unsuppressed, normalized importance ≥ 0.50 and required level > 0. */
export function normalizeDescriptor(row: DescriptorRow): ScoredRequirement | null {
  if (row.suppressed) return null;
  const weight = normalizeOnScale(row.importance, row.importanceScale);
  const requiredLevel = normalizeOnScale(row.level, row.levelScale);
  if (weight === null || requiredLevel === null) return null;
  if (weight < WEIGHTS.minDescriptorImportance || requiredLevel <= 0) return null;
  return { id: row.id, kind: "descriptor", category: row.category, weight, requiredLevel, sourceRefs: [row.sourceRef] };
}

export function normalizeSoftware(row: SoftwareRow): ScoredRequirement {
  const s = WEIGHTS.software;
  return {
    id: row.id,
    kind: "software",
    category: "software",
    weight: s.base + (row.hot ? s.hot : 0) + (row.inDemand ? s.inDemand : 0),
    requiredLevel: s.requiredLevel,
    sourceRefs: [row.sourceRef],
  };
}

/**
 * Deduplicate identical canonical requirements: strongest weight, all source references (sorted, unique).
 * Assumption (documented): the highest required level is kept, matching the §7.3 prerequisite rule.
 * Output order is by canonical ID so results never depend on input order.
 */
export function dedupeRequirements(reqs: readonly ScoredRequirement[]): ScoredRequirement[] {
  const byId = new Map<string, ScoredRequirement>();
  for (const r of reqs) {
    const prev = byId.get(r.id);
    if (!prev) {
      byId.set(r.id, { ...r, sourceRefs: [...r.sourceRefs] });
      continue;
    }
    if (prev.kind !== r.kind) throw new RangeError(`requirement ${r.id} appears as both descriptor and software`);
    const stronger = r.weight > prev.weight ? r : prev;
    byId.set(r.id, {
      ...stronger,
      weight: Math.max(prev.weight, r.weight),
      requiredLevel: Math.max(prev.requiredLevel, r.requiredLevel),
      sourceRefs: [...new Set([...prev.sourceRefs, ...r.sourceRefs])].sort(),
    });
  }
  return [...byId.values()].sort((a, b) => cmp(a.id, b.id));
}

/** Build a role's scored requirements; no positive usable requirement means unscorable, never a perfect match. */
export function buildRoleRequirements(descriptors: readonly DescriptorRow[], software: readonly SoftwareRow[]): RoleRequirementSet {
  const reqs = dedupeRequirements([
    ...descriptors.map(normalizeDescriptor).filter((r): r is ScoredRequirement => r !== null),
    ...software.map(normalizeSoftware),
  ]);
  return reqs.length === 0 ? { kind: "unscorable", reason: "no-usable-requirements" } : { kind: "scorable", requirements: reqs };
}

// ---- User levels (§7.1) ----

export type SoftwareProficiency = 1 | 2 | 3 | 4;

export const softwareProficiencyLevel = (p: SoftwareProficiency): number => WEIGHTS.softwareProficiency[p];

/** Accepted occupation-inferred level = source normalized level × min(1, years/2); unknown years → no time-derived credit (0). */
export function inferredDescriptorLevel(sourceLevel: number, confirmedYears: number | null): number {
  if (confirmedYears === null || !Number.isFinite(confirmedYears) || confirmedYears <= 0) return 0;
  return clamp01(sourceLevel) * Math.min(1, confirmedYears / WEIGHTS.inferredFullYears);
}

/** Unconfirmed extracted suggestion: evidence-backed level (0–5) / 5, capped at 0.8. */
export function extractedSuggestionLevel(evidenceLevel: number): number {
  return Math.min(WEIGHTS.extractedCap, clamp01(evidenceLevel / WEIGHTS.extractedEvidenceDivisor));
}

/**
 * Effective level: a user override wins, including a lower one; otherwise the maximum accepted
 * evidence/inference level. Callers pass only confirmed, non-deleted items. Null = no level.
 */
export function resolveEffectiveLevel(override: number | null, acceptedLevels: readonly number[]): number | null {
  if (override !== null) return clamp01(override);
  const finite = acceptedLevels.filter(Number.isFinite);
  return finite.length === 0 ? null : clamp01(Math.max(...finite));
}

/** Ordinal string comparison (locale-independent, deterministic). */
export const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

import { ScoredRequirementSchema, type FitBreakdown, type RequirementCoverage, type ScoredRequirement, type SkillNeighbor, type UserSkillLevel } from "@/types/scoring";
import { computeCoverage, indexUserLevels } from "./coverage";
import { WEIGHTS } from "./weights";

// §7.2 Fit. FitDesc / FitTools = Σ(w·c)/Σw per group; one group → that group; both → alpha blend; none → unscorable.

/** PROVISIONAL (R3-2, until U15 lock). */
export interface FitInput {
  requirements: readonly ScoredRequirement[];
  userLevels: readonly UserSkillLevel[];
  neighbors: readonly SkillNeighbor[];
  /** The profile has a confirmed prior role mapped to a canonical occupation. */
  hasConfirmedMappedPriorRole: boolean;
  /** Count of confirmed descriptor evidences (extracted with quotes, accepted). */
  confirmedDescriptorEvidenceCount: number;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export type FitOutcome = { kind: "scored"; fit: FitBreakdown } | { kind: "unscorable"; reason: "no-usable-requirements" };

function groupFit(reqs: readonly ScoredRequirement[], byId: ReadonlyMap<string, RequirementCoverage>): number | null {
  let num = 0;
  let den = 0;
  for (const r of reqs) {
    const c = byId.get(r.id);
    if (!c) continue;
    num += r.weight * c.effective;
    den += r.weight;
  }
  return den > 0 ? num / den : null;
}

export function computeFit(input: FitInput): FitOutcome {
  // Contract guard: weight ≥0.50, q in (0,1], namespaced ID; duplicates would double-count weight.
  const usable = input.requirements.map((r) => {
    const parsed = ScoredRequirementSchema.safeParse(r);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new RangeError(`invalid requirement ${r.id}: ${issue ? `${issue.path.join(".") || "(root)"}: ${issue.message}` : "schema"}`);
    }
    return parsed.data;
  });
  if (new Set(usable.map((r) => r.id)).size !== usable.length) throw new RangeError("duplicate requirement IDs; dedupe first (§7.1)");
  if (usable.length === 0) return { kind: "unscorable", reason: "no-usable-requirements" };

  const levels = indexUserLevels(input.userLevels);
  const coverages = usable.map((r) => computeCoverage(r, levels, input.neighbors));
  const byId = new Map(coverages.map((c) => [c.requirementId, c]));
  const fitDesc = groupFit(usable.filter((r) => r.kind === "descriptor"), byId);
  const fitTools = groupFit(usable.filter((r) => r.kind === "software"), byId);

  let fit: number;
  let alpha: number | null = null;
  if (fitDesc !== null && fitTools !== null) {
    const strong =
      input.hasConfirmedMappedPriorRole || input.confirmedDescriptorEvidenceCount >= WEIGHTS.alpha.minConfirmedDescriptorEvidences;
    alpha = strong ? WEIGHTS.alpha.strong : WEIGHTS.alpha.weak;
    fit = alpha * fitDesc + (1 - alpha) * fitTools;
  } else if (fitDesc !== null) {
    fit = fitDesc;
  } else if (fitTools !== null) {
    fit = fitTools;
  } else {
    return { kind: "unscorable", reason: "no-usable-requirements" };
  }
  return { kind: "scored", fit: { fit, fitDesc, fitTools, alpha, coverages } };
}

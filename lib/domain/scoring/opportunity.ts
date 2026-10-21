import type { DemandBreakdown, OpportunityResult, ReachBreakdown } from "@/types/scoring";
import { computeDemand, type DemandInput } from "./demand";
import { computeFit, type FitInput } from "./fit";
import { computeReach, type ReachInput } from "./reach";
import { SCORING_VERSION, WEIGHTS } from "./weights";

// §7.5 Opportunity = 100 × Fit^0.50 × Reach^0.25 × Demand^0.25, on normalized [0,1] components (never display values).
// Full precision; rounding happens only in presentation.

export function opportunityScore(fit: number, reach: number, demand: number): number {
  for (const v of [fit, reach, demand]) {
    if (!Number.isFinite(v) || v < 0 || v > 1) throw new RangeError("Opportunity components must be finite and in [0,1]");
  }
  const e = WEIGHTS.opportunity;
  return 100 * fit ** e.fitExponent * reach ** e.reachExponent * demand ** e.demandExponent;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface ScoreRoleInput {
  soc: string;
  fit: FitInput;
  reach: ReachInput;
  demand: DemandInput;
}

/** PROVISIONAL domain-local outcome type (lead decision R3-2) until U15 locks the service DTO. */
export type ScoreRoleOutcome =
  | { kind: "scored"; result: OpportunityResult }
  | { kind: "unscorable"; soc: string; reason: "no-usable-requirements" };

export function scoreRole(input: ScoreRoleInput): ScoreRoleOutcome {
  const fit = computeFit(input.fit);
  if (fit.kind === "unscorable") return { kind: "unscorable", soc: input.soc, reason: fit.reason };
  const reach: ReachBreakdown = computeReach(input.reach);
  const demand: DemandBreakdown = computeDemand(input.demand);
  return {
    kind: "scored",
    result: {
      scoringVersion: SCORING_VERSION,
      soc: input.soc,
      opportunity: opportunityScore(fit.fit.fit, reach.reach, demand.demand),
      fit: fit.fit,
      reach,
      demand,
    },
  };
}

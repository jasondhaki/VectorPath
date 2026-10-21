import { WorkloadBreakdownSchema, type ReachBreakdown, type WorkloadBreakdown } from "@/types/scoring";
import { WEIGHTS } from "./weights";

// §7.3 Reach = [1/(1 + W/12)] × 0.6^zoneGap. W comes from the canonical workload estimator (U16), not computed here.

/** PROVISIONAL (R3-2, until U15 lock). A preparation zone on a verified source scale (e.g. O*NET Job Zone, scale "onet-31.0:job-zone"). */
export interface PreparationZone {
  zone: number;
  scaleId: string;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface ReachInput {
  workload: WorkloadBreakdown;
  targetZone: PreparationZone | null;
  /** The user's confirmed prior-role zone; null when no confirmed mapped prior role. */
  userZone: PreparationZone | null;
}

/** zoneGap = max(0, target − user) only when both are known on the same scale; otherwise null (zero penalty, warn). */
export function zoneGap(target: PreparationZone | null, user: PreparationZone | null): number | null {
  if (target === null || user === null || target.scaleId !== user.scaleId) return null;
  if (!Number.isInteger(target.zone) || !Number.isInteger(user.zone)) throw new RangeError("preparation zones must be integers");
  return Math.max(0, target.zone - user.zone);
}

export function computeReach(input: ReachInput): ReachBreakdown {
  const { weeks, totalHours, weeklyHours } = WorkloadBreakdownSchema.parse(input.workload);
  if (Math.abs(weeks - totalHours / weeklyHours) > 1e-9 * Math.max(1, weeks)) {
    throw new RangeError("workload weeks must equal totalHours / weeklyHours (§7.3)");
  }
  const gap = zoneGap(input.targetZone, input.userZone);
  const r = WEIGHTS.reach;
  const reach = (1 / (1 + weeks / r.weeksScale)) * r.zoneBase ** (gap ?? 0);
  return {
    reach,
    weeks,
    zoneGap: gap,
    zoneKnown: gap !== null,
    longReach: weeks > r.longReachWeeks || (gap !== null && gap >= r.longReachZoneGap),
  };
}

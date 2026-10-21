import type { CoverageState, RequirementCoverage, ScoredRequirement, SkillNeighbor, UserSkillLevel } from "@/types/scoring";
import { cmp } from "./requirements";
import { WEIGHTS } from "./weights";

// §7.2 coverage. Inputs: a scored requirement (q > 0), resolved user levels in [0,1] and approved neighbors.

/** Index resolved user levels; duplicate IDs are an upstream resolution bug, not something to guess about. */
export function indexUserLevels(levels: readonly UserSkillLevel[]): ReadonlyMap<string, number> {
  const map = new Map<string, number>();
  for (const l of levels) {
    if (map.has(l.id)) throw new RangeError(`duplicate resolved user level for ${l.id}`);
    if (!Number.isFinite(l.level) || l.level < 0 || l.level > 1) throw new RangeError(`user level for ${l.id} must be in [0,1]`);
    map.set(l.id, l.level);
  }
  return map;
}

export function coverageState(direct: number, neighbor: number): CoverageState {
  const s = WEIGHTS.state;
  if (direct >= s.have) return "have";
  if (direct >= s.partialMin) return "partial";
  if (neighbor >= s.transferableNeighborMin) return "transferable";
  return "to-build";
}

/**
 * d = min(1, level/q); missing level → 0.
 * n (software only) = max 0.6 × similarity × min(1, neighborLevel/q) over approved neighbors with similarity ≥ 0.80,
 * either edge direction; ties resolve to the lowest neighbor ID. Descriptors get no neighbor credit.
 * c = max(d, n).
 */
export function computeCoverage(
  req: ScoredRequirement,
  userLevels: ReadonlyMap<string, number>,
  neighbors: readonly SkillNeighbor[],
): RequirementCoverage {
  const q = req.requiredLevel;
  if (!Number.isFinite(q) || q <= 0 || q > 1) throw new RangeError(`required level for ${req.id} must be in (0,1]`);
  const direct = Math.min(1, (userLevels.get(req.id) ?? 0) / q);
  let neighbor = 0;
  let neighborVia: string | null = null;
  if (req.kind === "software") {
    for (const e of neighbors) {
      const other = e.fromId === req.id ? e.toId : e.toId === req.id ? e.fromId : null;
      if (!Number.isFinite(e.similarity) || e.similarity < 0 || e.similarity > 1) throw new RangeError("neighbor similarity must be in [0,1]");
      if (other === null || other === req.id || e.similarity < WEIGHTS.neighbor.minSimilarity) continue;
      const lvl = userLevels.get(other);
      if (lvl === undefined) continue;
      const credit = WEIGHTS.neighbor.factor * e.similarity * Math.min(1, lvl / q);
      if (credit <= 0) continue;
      if (credit > neighbor || (credit === neighbor && neighborVia !== null && cmp(other, neighborVia) < 0)) {
        neighbor = credit;
        neighborVia = other;
      }
    }
  }
  return {
    requirementId: req.id,
    direct,
    neighbor,
    effective: Math.max(direct, neighbor),
    state: coverageState(direct, neighbor),
    neighborVia,
  };
}

import type { OpportunityResult } from "@/types/scoring";
import { cmp } from "./requirements";
import { WEIGHTS } from "./weights";

// §7.5 ordering, filters, held roles and minor-group diversity.
// PROVISIONAL domain-local types (lead decision R3-2) until U15 locks the service DTO.

/** PROVISIONAL (R3-2, until U15 lock). */
export interface RankCandidate {
  result: OpportunityResult;
  /** O*NET minor group used for the diversity cap. */
  minorGroup: string;
  /** Documented sector or null when explicitly unknown. */
  sector: string | null;
  green: boolean;
  /** Confirmed years the user held this role; null when not held. */
  heldConfirmedYears: number | null;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface RankFilters {
  sectors?: readonly string[];
  greenOnly?: boolean;
  hideLongReach?: boolean;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface RankedRole {
  rank: number;
  candidate: RankCandidate;
  /** True when this slot was filled by relaxing the per-minor-group cap. */
  diversityRelaxed: boolean;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface RankOutput {
  /** Diversified top ten first (in base order), then every remaining eligible role in base order. */
  ranked: RankedRole[];
  topCount: number;
  relaxedSlots: number;
  /** Roles held ≥1 confirmed year, listed separately in base order — never lost. */
  held: RankCandidate[];
}

/** Base order: Opportunity desc, Fit desc, lower W, SOC code — all full precision. */
export function compareCandidates(a: RankCandidate, b: RankCandidate): number {
  const x = a.result;
  const y = b.result;
  return (
    y.opportunity - x.opportunity ||
    y.fit.fit - x.fit.fit ||
    x.reach.weeks - y.reach.weeks ||
    cmp(x.soc, y.soc)
  );
}

function passes(c: RankCandidate, f: RankFilters): boolean {
  if (f.sectors && f.sectors.length > 0 && (c.sector === null || !f.sectors.includes(c.sector))) return false;
  if (f.greenOnly && !c.green) return false;
  if (f.hideLongReach && c.result.reach.longReach) return false;
  return true;
}

export function rankRoles(candidates: readonly RankCandidate[], filters: RankFilters = {}): RankOutput {
  const socs = new Set(candidates.map((c) => c.result.soc));
  if (socs.size !== candidates.length) throw new RangeError("duplicate SOC in rank candidates");

  const isHeld = (c: RankCandidate) => c.heldConfirmedYears !== null && c.heldConfirmedYears >= WEIGHTS.heldRoleMinYears;
  const held = candidates.filter(isHeld).sort(compareCandidates);
  const base = candidates.filter((c) => !isHeld(c) && passes(c, filters)).sort(compareCandidates);

  const { topN, maxPerMinorGroup } = WEIGHTS.diversity;
  const picked = new Set<RankCandidate>();
  const relaxed = new Set<RankCandidate>();
  const perGroup = new Map<string, number>();
  for (const c of base) {
    if (picked.size >= topN) break;
    const n = perGroup.get(c.minorGroup) ?? 0;
    if (n < maxPerMinorGroup) {
      picked.add(c);
      perGroup.set(c.minorGroup, n + 1);
    }
  }
  // Relax one slot at a time in base order until ten are filled or no candidates remain.
  for (const c of base) {
    if (picked.size >= topN) break;
    if (!picked.has(c)) {
      picked.add(c);
      relaxed.add(c);
    }
  }

  const top = base.filter((c) => picked.has(c));
  const rest = base.filter((c) => !picked.has(c));
  const ranked = [...top, ...rest].map((candidate, i) => ({ rank: i + 1, candidate, diversityRelaxed: relaxed.has(candidate) }));
  return { ranked, topCount: top.length, relaxedSlots: relaxed.size, held };
}

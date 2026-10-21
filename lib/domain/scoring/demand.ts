import type { DemandBreakdown } from "@/types/scoring";
import { cmp } from "./requirements";
import { WEIGHTS, clamp01 } from "./weights";

// §7.4 Demand. Pure: the caller supplies permitted, comparable snapshots (same data version and filters)
// and the injected "as of" date; this module applies age eligibility, cohort size and the formulas.

type Support = DemandBreakdown["support"];

/** PROVISIONAL (R3-2, until U15 locks the service DTO). One role-query market snapshot. count null = missing (never zero); 0 is a valid recorded count. */
export interface MarketSnapshot {
  id: string;
  soc: string;
  count: number | null;
  /** UTC observation date, YYYY-MM-DD. */
  observedDate: string;
}

/** PROVISIONAL (R3-2, until U15 lock). A provider sector-growth observation in percent (5.2 means 5.2%). null = not reported. */
export interface SectorObservation {
  year: number;
  growthPercent: number | null;
}

/** PROVISIONAL (R3-2, until U15 lock). */
export interface DemandInput {
  /** Injected clock: UTC date YYYY-MM-DD. */
  asOf: string;
  /** The target role's snapshot in the selected country, or null. */
  role: MarketSnapshot | null;
  /** All comparable role snapshots for the country (should include the role's own snapshot). */
  cohort: readonly MarketSnapshot[];
  /** Sector-growth observations for the role's mapped sector and country; empty when none. */
  sector: readonly SectorObservation[];
  /** Verified next-year GDP growth forecast in percent, with its vintage; null when none. */
  forecast: { growthPercent: number; vintage: string } | null;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days between two UTC date-only strings (b − a). Throws on invalid dates. */
export function daysBetween(a: string, b: string): number {
  return (toUtcDay(b) - toUtcDay(a)) / 86_400_000;
}

function toUtcDay(s: string): number {
  const m = DATE.exec(s);
  if (!m) throw new RangeError(`invalid date-only string: ${s}`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`invalid calendar date: ${s}`);
  }
  return t;
}

const ageEligible = (s: MarketSnapshot, asOf: string): boolean => {
  const age = daysBetween(s.observedDate, asOf);
  return age >= 0 && age <= WEIGHTS.demand.maxSnapshotAgeDays;
};

/** P = [#below x + 0.5 × #equal x]/N for N ≥ 10; otherwise null. Exact-equality ties, deterministic. */
export function percentileRank(x: number, cohort: readonly number[]): number | null {
  if (cohort.length < WEIGHTS.demand.minCohort) return null;
  let below = 0;
  let equal = 0;
  for (const v of cohort) {
    if (v < x) below++;
    else if (v === x) equal++;
  }
  return (below + 0.5 * equal) / cohort.length;
}

/**
 * M = clamp01(0.5 + (g − 0.02)/0.10), g = mean of up to the last three reported, age-eligible observations
 * (percent ÷ 100). A verified forecast adds clamp(−0.1, 0.1, (f − 0.03)/0.2), then clamp01. No sector data → null.
 */
export function macroSignal(
  sector: readonly SectorObservation[],
  forecast: DemandInput["forecast"],
  asOfYear: number,
): { macro: number; years: number[]; forecastApplied: boolean } | null {
  const d = WEIGHTS.demand;
  const eligible = sector
    .filter((o): o is { year: number; growthPercent: number } => o.growthPercent !== null && Number.isFinite(o.growthPercent))
    .filter((o) => Number.isInteger(o.year) && o.year <= asOfYear && asOfYear - o.year <= d.maxMacroAgeYears)
    .sort((a, b) => b.year - a.year);
  if (new Set(eligible.map((o) => o.year)).size !== eligible.length) throw new RangeError("duplicate sector-growth year");
  const used = eligible.slice(0, d.maxSectorObservations);
  if (used.length === 0) return null;
  const g = used.reduce((s, o) => s + o.growthPercent / 100, 0) / used.length;
  let macro = clamp01(0.5 + (g - d.macroBaseline) / d.macroSpan);
  const forecastApplied = forecast !== null && Number.isFinite(forecast.growthPercent);
  if (forecast !== null && forecastApplied) {
    const adj = (forecast.growthPercent / 100 - d.forecastBaseline) / d.forecastDivisor;
    macro = clamp01(macro + Math.min(d.forecastClamp, Math.max(-d.forecastClamp, adj)));
  }
  return { macro, years: used.map((o) => o.year).sort((a, b) => a - b), forecastApplied };
}

function assertSnapshot(s: MarketSnapshot): void {
  if (s.count !== null && (!Number.isFinite(s.count) || s.count < 0)) throw new RangeError(`market snapshot ${s.id}: count must be a finite non-negative number or null`);
  toUtcDay(s.observedDate);
}

export function computeDemand(input: DemandInput): DemandBreakdown {
  const d = WEIGHTS.demand;
  if (input.role) assertSnapshot(input.role);
  input.cohort.forEach(assertSnapshot);
  const asOfYear = new Date(toUtcDay(input.asOf)).getUTCFullYear();

  // Percentile evidence.
  let percentile: number | null = null;
  let cohortSize: number | null = null;
  let snapshotIds: string[] = [];
  let snapshotDate: string | null = null;
  let roleAgeDays: number | null = null;
  const role = input.role;
  if (role !== null && role.count !== null && ageEligible(role, input.asOf)) {
    const eligible = input.cohort.filter(
      (s): s is MarketSnapshot & { count: number } => s.count !== null && ageEligible(s, input.asOf),
    );
    if (new Set(eligible.map((s) => s.soc)).size !== eligible.length) throw new RangeError("duplicate SOC in market cohort (§7.4: one snapshot per role)");
    // An empty cohort means only the role's own listing is known (P unavailable); a non-empty one must contain it.
    if (input.cohort.length > 0 && !eligible.some((s) => s.id === role.id)) {
      throw new RangeError("the role's own snapshot must be in the eligible cohort");
    }
    cohortSize = eligible.length;
    percentile = percentileRank(role.count, eligible.map((s) => s.count));
    if (percentile !== null) {
      snapshotIds = eligible.map((s) => s.id).sort(cmp);
      snapshotDate = role.observedDate;
      roleAgeDays = daysBetween(role.observedDate, input.asOf);
    }
  }

  const m = macroSignal(input.sector, input.forecast, asOfYear);
  const macro = m?.macro ?? null;
  const pSupport: Support = roleAgeDays !== null && roleAgeDays <= d.highSupportMaxAgeDays ? "High" : "Medium";

  let demand: number;
  let support: Support;
  if (percentile !== null && macro !== null) {
    demand = d.percentileWeight * percentile + d.macroWeight * macro;
    support = pSupport;
  } else if (percentile !== null) {
    demand = percentile;
    support = pSupport;
  } else if (macro !== null && m !== null) {
    demand = macro;
    support = m.years.length >= d.mediumMinSectorObservations ? "Medium" : "Low";
  } else {
    demand = d.neutralPrior;
    support = "Low";
  }

  return {
    demand,
    percentile,
    cohortSize,
    macro,
    sectorYears: m?.years ?? [],
    forecastApplied: m?.forecastApplied ?? false,
    support,
    noMarketData: percentile === null && macro === null,
    snapshotIds,
    snapshotDate,
    forecastVintage: m?.forecastApplied && input.forecast ? input.forecast.vintage : null,
  };
}

import { describe, expect, it } from "vitest";
import { DemandBreakdownSchema, type OpportunityResult } from "@/types/scoring";
import { computeDemand, daysBetween, macroSignal, percentileRank, type MarketSnapshot } from "@/lib/domain/scoring/demand";
import { compareCandidates, rankRoles, type RankCandidate } from "@/lib/domain/scoring/rank";

// Synthetic test vectors only; counts are invented test numbers, not market data.

const AS_OF = "2026-10-21";
const snap = (id: string, count: number | null, observedDate = "2026-10-18"): MarketSnapshot => ({ id, soc: id, count, observedDate });
const cohortOf = (counts: (number | null)[], date?: string) => counts.map((c, i) => snap(`s${String(i).padStart(2, "0")}`, c, date));

describe("§7.4 percentile", () => {
  it("requires N ≥ 10", () => {
    expect(percentileRank(5, [1, 2, 3, 4, 5, 6, 7, 8, 9])).toBeNull();
    expect(percentileRank(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBeCloseTo(0.45, 12);
  });
  it("splits ties at half weight deterministically (tied cohort)", () => {
    expect(percentileRank(3, [3, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toBe(0.5);
    expect(percentileRank(3, [1, 1, 3, 3, 3, 3, 5, 5, 5, 5])).toBeCloseTo(0.4, 12);
  });
  it("treats a recorded zero as data", () => {
    expect(percentileRank(0, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])).toBeCloseTo(0.05, 12);
  });
});

describe("§7.4 Demand", () => {
  const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  it("uses the neutral prior with no evidence and says so", () => {
    const d = DemandBreakdownSchema.parse(computeDemand({ asOf: AS_OF, role: null, cohort: [], sector: [], forecast: null }));
    expect(d).toMatchObject({ demand: 0.5, support: "Low", noMarketData: true, percentile: null, macro: null });
  });
  it("P only, fresh (≤7 days) → High; zero-count role is valid data", () => {
    const cohort = cohortOf(ten);
    const d = computeDemand({ asOf: AS_OF, role: cohort[0] ?? null, cohort, sector: [], forecast: null });
    expect(d).toMatchObject({ support: "High", cohortSize: 10, snapshotDate: "2026-10-18", noMarketData: false });
    expect(d.demand).toBeCloseTo(0.05, 12);
    expect(d.snapshotIds).toHaveLength(10);
  });
  it("P older than 7 days → Medium; older than 30 days → not a scoring input", () => {
    const mid = cohortOf(ten, "2026-10-01");
    expect(computeDemand({ asOf: AS_OF, role: mid[5] ?? null, cohort: mid, sector: [], forecast: null }).support).toBe("Medium");
    const old = cohortOf(ten, "2026-09-01");
    expect(computeDemand({ asOf: AS_OF, role: old[5] ?? null, cohort: old, sector: [], forecast: null }).noMarketData).toBe(true);
  });
  it("missing counts are not zero and shrink the cohort (insufficient cohort → no P)", () => {
    const cohort = cohortOf([...ten.slice(0, 9), null]);
    const d = computeDemand({ asOf: AS_OF, role: cohort[3] ?? null, cohort, sector: [], forecast: null });
    expect(d).toMatchObject({ percentile: null, cohortSize: 9, noMarketData: true, demand: 0.5 });
    const missingRole = computeDemand({ asOf: AS_OF, role: snap("x", null), cohort: cohortOf(ten), sector: [], forecast: null });
    expect(missingRole.percentile).toBeNull();
  });
  it("divides sector percentages by 100 and averages up to the last three eligible years", () => {
    const m = macroSignal(
      [
        { year: 2025, growthPercent: 7 },
        { year: 2024, growthPercent: 2 },
        { year: 2023, growthPercent: 2 },
        { year: 2022, growthPercent: 50 },
        { year: 2019, growthPercent: 99 },
      ],
      null,
      2026,
    );
    // g = (0.07 + 0.02 + 0.02)/3 ≈ 0.03667 → M = 0.5 + 0.01667/0.10
    expect(m?.years).toEqual([2023, 2024, 2025]);
    expect(m?.macro).toBeCloseTo(2 / 3, 12);
  });
  it("ignores observations older than five years and null values; none → M unavailable", () => {
    expect(macroSignal([{ year: 2020, growthPercent: 3 }, { year: 2025, growthPercent: null }], null, 2026)).toBeNull();
  });
  it("applies a clamped forecast adjustment then clamps to [0,1]", () => {
    const base = [{ year: 2025, growthPercent: 2 }];
    expect(macroSignal(base, { growthPercent: 5, vintage: "v" }, 2026)?.macro).toBeCloseTo(0.6, 12);
    expect(macroSignal(base, { growthPercent: 100, vintage: "v" }, 2026)?.macro).toBeCloseTo(0.6, 12);
    expect(macroSignal([{ year: 2025, growthPercent: 30 }], { growthPercent: 100, vintage: "v" }, 2026)?.macro).toBe(1);
  });
  it("M only: Medium with ≥2 observations, Low with one; forecast vintage carried", () => {
    const two = computeDemand({ asOf: AS_OF, role: null, cohort: [], sector: [{ year: 2025, growthPercent: 2 }, { year: 2024, growthPercent: 2 }], forecast: { growthPercent: 3, vintage: "GEP-2026-06" } });
    expect(two).toMatchObject({ support: "Medium", demand: 0.5, forecastApplied: true, forecastVintage: "GEP-2026-06", sectorYears: [2024, 2025] });
    const one = computeDemand({ asOf: AS_OF, role: null, cohort: [], sector: [{ year: 2025, growthPercent: 2 }], forecast: null });
    expect(one).toMatchObject({ support: "Low", forecastApplied: false, forecastVintage: null, noMarketData: false });
  });
  it("P and M → 0.7P + 0.3M", () => {
    const cohort = cohortOf(ten);
    const d = computeDemand({ asOf: AS_OF, role: cohort[9] ?? null, cohort, sector: [{ year: 2025, growthPercent: 12 }], forecast: null });
    expect(d.demand).toBeCloseTo(0.7 * 0.95 + 0.3 * 1, 12);
    expect(d.support).toBe("High");
  });
  it("rejects invalid dates", () => {
    expect(() => daysBetween("2026-02-30", AS_OF)).toThrow(RangeError);
    expect(daysBetween("2026-10-14", AS_OF)).toBe(7);
  });
});

const result = (soc: string, opportunity: number, fit = 0.5, weeks = 10): OpportunityResult => ({
  scoringVersion: "astra-v1",
  soc,
  opportunity,
  fit: { fit, fitDesc: fit, fitTools: null, alpha: null, coverages: [] },
  reach: { reach: 0.5, weeks, zoneGap: null, zoneKnown: false, longReach: weeks > 26 },
  demand: { demand: 0.5, percentile: null, cohortSize: null, macro: null, sectorYears: [], forecastApplied: false, support: "Low", noMarketData: true, snapshotIds: [], snapshotDate: null, forecastVintage: null },
});
const cand = (soc: string, opportunity: number, over: Partial<RankCandidate> = {}, fit?: number, weeks?: number): RankCandidate => ({
  result: result(soc, opportunity, fit, weeks),
  minorGroup: soc.slice(0, 4),
  sector: "services",
  green: false,
  heldConfirmedYears: null,
  ...over,
});

describe("§7.5 ordering", () => {
  it("breaks exact ties by Fit, then lower W, then SOC", () => {
    const a = cand("15-1001.00", 50, {}, 0.6, 10);
    const b = cand("15-1002.00", 50, {}, 0.7, 10);
    const c = cand("15-1003.00", 50, {}, 0.7, 5);
    const d = cand("15-1000.00", 50, {}, 0.7, 5);
    expect([a, b, c, d].sort(compareCandidates).map((x) => x.result.soc)).toEqual(["15-1000.00", "15-1003.00", "15-1002.00", "15-1001.00"]);
  });
  it("is independent of input order", () => {
    const xs = [cand("15-1001.00", 40), cand("17-1001.00", 60), cand("13-1001.00", 50)];
    expect(rankRoles(xs).ranked.map((r) => r.candidate.result.soc)).toEqual(rankRoles([...xs].reverse()).ranked.map((r) => r.candidate.result.soc));
  });
});

describe("§7.5 diversity and held roles", () => {
  it("caps three per minor group in the top ten and keeps the rest after", () => {
    const xs = [
      ...Array.from({ length: 6 }, (_, i) => cand(`15-11${i}0.00`, 90 - i, { minorGroup: "15-1" })),
      ...Array.from({ length: 8 }, (_, i) => cand(`${20 + i}-1000.00`, 50 - i, { minorGroup: `${20 + i}-1` })),
    ];
    const out = rankRoles(xs);
    const top = out.ranked.slice(0, 10);
    expect(top.filter((r) => r.candidate.minorGroup === "15-1")).toHaveLength(3);
    expect(out).toMatchObject({ topCount: 10, relaxedSlots: 0 });
    expect(out.ranked).toHaveLength(14);
    expect(out.ranked.map((r) => r.rank)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });
  it("relaxes one slot at a time in base order and labels it", () => {
    const xs = [
      ...Array.from({ length: 8 }, (_, i) => cand(`15-11${i}0.00`, 90 - i, { minorGroup: "15-1" })),
      ...Array.from({ length: 4 }, (_, i) => cand(`${20 + i}-1000.00`, 50 - i, { minorGroup: `${20 + i}-1` })),
    ];
    const out = rankRoles(xs);
    expect(out.relaxedSlots).toBe(3);
    const relaxed = out.ranked.filter((r) => r.diversityRelaxed).map((r) => r.candidate.result.soc);
    expect(relaxed).toEqual(["15-1130.00", "15-1140.00", "15-1150.00"]);
    expect(out.ranked.slice(0, 10).map((r) => r.candidate.result.opportunity)).toEqual([90, 89, 88, 87, 86, 85, 50, 49, 48, 47]);
  });
  it("reports a shortage without relaxing when fewer than ten roles exist", () => {
    const out = rankRoles([cand("15-1001.00", 10), cand("15-1002.00", 9)]);
    expect(out).toMatchObject({ topCount: 2, relaxedSlots: 0 });
  });
  it("lists held roles separately and applies filters deterministically", () => {
    const xs = [
      cand("15-1001.00", 90, { heldConfirmedYears: 1 }),
      cand("15-1002.00", 80, { heldConfirmedYears: 0.5 }),
      cand("17-1001.00", 70, { green: true, sector: "industry" }),
      cand("19-1001.00", 60, { sector: null }),
      cand("21-1001.00", 50, {}, 0.5, 30),
    ];
    const out = rankRoles(xs);
    expect(out.held.map((c) => c.result.soc)).toEqual(["15-1001.00"]);
    expect(out.ranked.map((r) => r.candidate.result.soc)).toEqual(["15-1002.00", "17-1001.00", "19-1001.00", "21-1001.00"]);
    expect(rankRoles(xs, { greenOnly: true }).ranked.map((r) => r.candidate.result.soc)).toEqual(["17-1001.00"]);
    expect(rankRoles(xs, { sectors: ["services"] }).ranked).toHaveLength(2);
    expect(rankRoles(xs, { hideLongReach: true }).ranked.map((r) => r.candidate.result.soc)).not.toContain("21-1001.00");
  });
  it("rejects duplicate SOCs", () => {
    expect(() => rankRoles([cand("15-1001.00", 1), cand("15-1001.00", 2)])).toThrow(RangeError);
  });
});

describe("U14 review fixes (demand/rank)", () => {
  const ten = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  it("F5c: support is High at exactly 7 days and Medium at 8", () => {
    const at7 = cohortOf(ten, "2026-10-14");
    const at8 = cohortOf(ten, "2026-10-13");
    expect(computeDemand({ asOf: AS_OF, role: at7[0] ?? null, cohort: at7, sector: [], forecast: null }).support).toBe("High");
    expect(computeDemand({ asOf: AS_OF, role: at8[0] ?? null, cohort: at8, sector: [], forecast: null }).support).toBe("Medium");
  });
  it("F5d: cap-forced relaxation with fewer than ten candidates", () => {
    const xs = [...Array.from({ length: 5 }, (_, i) => cand(`15-11${i}0.00`, 90 - i, { minorGroup: "15-1" })), cand("20-1000.00", 10, { minorGroup: "20-1" })];
    const out = rankRoles(xs);
    expect(out).toMatchObject({ topCount: 6, relaxedSlots: 2 });
    expect(out.ranked.filter((r) => r.diversityRelaxed).map((r) => r.candidate.result.soc)).toEqual(["15-1130.00", "15-1140.00"]);
  });
  it("F5e: future-dated snapshots and future sector years are excluded", () => {
    const cohort = [...cohortOf(ten.slice(0, 9)), snap("future", 5, "2026-10-22")];
    expect(computeDemand({ asOf: AS_OF, role: cohort[0] ?? null, cohort, sector: [], forecast: null })).toMatchObject({ percentile: null, cohortSize: 9 });
    expect(computeDemand({ asOf: AS_OF, role: snap("f", 1, "2026-11-01"), cohort: [], sector: [], forecast: null }).noMarketData).toBe(true);
    expect(macroSignal([{ year: 2027, growthPercent: 5 }], null, 2026)).toBeNull();
  });
  it("F5f: duplicate sector year throws", () => {
    expect(() => macroSignal([{ year: 2025, growthPercent: 1 }, { year: 2025, growthPercent: 2 }], null, 2026)).toThrow(RangeError);
  });
  it("F5g: forecast without sector data leaves M null", () => {
    const d = computeDemand({ asOf: AS_OF, role: null, cohort: [], sector: [], forecast: { growthPercent: 6, vintage: "v" } });
    expect(d).toMatchObject({ macro: null, forecastApplied: false, forecastVintage: null, noMarketData: true, demand: 0.5 });
  });
  it("F5h: mixed-age cohort drops stale members from N and snapshotIds", () => {
    const cohort = [...cohortOf(ten), snap("stale-1", 3, "2026-09-01"), snap("stale-2", 4, "2026-08-01")];
    const d = computeDemand({ asOf: AS_OF, role: cohort[0] ?? null, cohort, sector: [], forecast: null });
    expect(d.cohortSize).toBe(10);
    expect(d.snapshotIds).not.toContain("stale-1");
    expect(d.snapshotIds).toHaveLength(10);
  });
  it("F2: rejects a cohort missing the role and duplicate SOCs", () => {
    const cohort = cohortOf(ten);
    expect(() => computeDemand({ asOf: AS_OF, role: snap("outsider", 3), cohort, sector: [], forecast: null })).toThrow(RangeError);
    const dup = [...cohort, { ...snap("s99", 4), soc: "s00" }];
    expect(() => computeDemand({ asOf: AS_OF, role: cohort[0] ?? null, cohort: dup, sector: [], forecast: null })).toThrow(RangeError);
  });
  it("F6: rejects negative counts", () => {
    expect(() => computeDemand({ asOf: AS_OF, role: snap("s00", -1), cohort: [], sector: [], forecast: null })).toThrow(RangeError);
  });
});

describe("U14 round 2 (R2-1)", () => {
  it("eligible role with an empty cohort: P unavailable, N 0, no market data, no throw", () => {
    const d = computeDemand({ asOf: AS_OF, role: snap("s00", 7), cohort: [], sector: [], forecast: null });
    expect(d).toMatchObject({ percentile: null, cohortSize: 0, noMarketData: true, demand: 0.5, support: "Low", snapshotIds: [] });
  });
});

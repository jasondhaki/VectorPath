// Baseline astra-v1 constants (architecture_astra.md §7). Every tunable scoring number lives here.
// Changing any value requires owner approval, a scoring-version bump, eval and a decision record.

export const SCORING_VERSION = "astra-v1";

export const WEIGHTS = {
  /** §7.1 descriptor inclusion: normalized importance ≥ 0.50. */
  minDescriptorImportance: 0.5,
  /** §7.1 software: w = 0.50 + 0.25·hot + 0.25·inDemand, required level 0.50. */
  software: { base: 0.5, hot: 0.25, inDemand: 0.25, requiredLevel: 0.5 },
  /** §7.1 user software proficiency 1/2/3/4 → level. */
  softwareProficiency: { 1: 0.25, 2: 0.5, 3: 0.75, 4: 1 },
  /** §7.1 inferred level = source level × min(1, years / inferredFullYears). */
  inferredFullYears: 2,
  /** §7.1 extracted suggestion = evidence level / divisor, capped until confirmed. */
  extractedEvidenceDivisor: 5,
  extractedCap: 0.8,
  /** §7.2 software neighbor credit. */
  neighbor: { minSimilarity: 0.8, factor: 0.6 },
  /** §7.2 coverage state thresholds. */
  state: { have: 0.9, partialMin: 0.4, transferableNeighborMin: 0.3 },
  /** §7.2 alpha between descriptor and tool fit when both groups exist. */
  alpha: { strong: 0.5, weak: 0.3, minConfirmedDescriptorEvidences: 3 },
  /** §7.3 Reach. */
  reach: { weeksScale: 12, zoneBase: 0.6, longReachWeeks: 26, longReachZoneGap: 2 },
  /** §7.4 Demand. */
  demand: {
    minCohort: 10,
    percentileWeight: 0.7,
    macroWeight: 0.3,
    highSupportMaxAgeDays: 7,
    maxSnapshotAgeDays: 30,
    maxMacroAgeYears: 5,
    maxSectorObservations: 3,
    mediumMinSectorObservations: 2,
    macroBaseline: 0.02,
    macroSpan: 0.1,
    forecastBaseline: 0.03,
    forecastDivisor: 0.2,
    forecastClamp: 0.1,
    neutralPrior: 0.5,
  },
  /** §7.5 Opportunity = 100 × Fit^0.50 × Reach^0.25 × Demand^0.25. */
  opportunity: { fitExponent: 0.5, reachExponent: 0.25, demandExponent: 0.25 },
  /** §7.5 diversity: at most three per minor group in the top ten. */
  diversity: { topN: 10, maxPerMinorGroup: 3 },
  /** §7.5 roles held for at least this many confirmed years are listed separately. */
  heldRoleMinYears: 1,
} as const;

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

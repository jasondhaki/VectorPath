import type { LucideIcon } from "lucide-react";
import { BookOpen, CalendarRange, ChartColumn, Compass, FileSearch, ListChecks, Route, Signpost } from "lucide-react";
import { FEATURES } from "@/lib/config/features";

type FeatureKey = keyof typeof FEATURES;

export interface NavItem {
  key: string;
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Route pattern from project-file-tree.md; null when no single destination exists yet. */
  path: string | null;
  /** True once the destination page is built and verified. Unbuilt items render as non-links. */
  built: boolean;
  feature?: FeatureKey;
  sidebar: boolean;
  mobile: "bar" | "menu";
}

// ui-context §4: sidebar order; bottom bar holds Overview, Roles, Plan, Paths; the rest go in the menu.
// Flip `built` only when the page exists — never link to a placeholder (CLAUDE.md §3.11).
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "overview", label: "Overview", icon: Compass, path: "/p/[profileId]", built: false, sidebar: true, mobile: "bar" },
  { key: "skills", label: "Skills", icon: ListChecks, path: "/p/[profileId]/skills", built: false, sidebar: true, mobile: "menu" },
  { key: "roles", label: "Opportunities", shortLabel: "Roles", icon: Signpost, path: "/p/[profileId]/roles", built: false, sidebar: true, mobile: "bar" },
  { key: "plan", label: "Plan", icon: CalendarRange, path: null, built: false, sidebar: false, mobile: "bar" },
  { key: "paths", label: "Paths", icon: Route, path: "/p/[profileId]/paths", built: false, feature: "paths", sidebar: true, mobile: "bar" },
  { key: "compare", label: "Compare a job", icon: FileSearch, path: "/p/[profileId]/compare", built: false, feature: "jobCompare", sidebar: true, mobile: "menu" },
  { key: "market", label: "Market", icon: ChartColumn, path: "/market/[country]", built: false, feature: "marketPulse", sidebar: true, mobile: "menu" },
  { key: "methodology", label: "Methodology", icon: BookOpen, path: "/methodology", built: false, sidebar: true, mobile: "menu" },
];

export interface ShellContext {
  profileId: string | null;
  country: string | null;
}

/** Items whose feature flag is off are hidden entirely (ui-context §4). */
export function visibleItems(items: readonly NavItem[], features: Readonly<Record<FeatureKey, boolean>> = FEATURES): NavItem[] {
  return items.filter((item) => !item.feature || features[item.feature]);
}

/** Concrete href, or null when the destination is unbuilt or needs a profile/country the shell lacks. */
export function resolveHref(item: NavItem, ctx: ShellContext): string | null {
  if (!item.built || item.path === null) return null;
  let href = item.path;
  for (const [param, value] of [["[profileId]", ctx.profileId], ["[country]", ctx.country]] as const) {
    if (!href.includes(param)) continue;
    if (!value) return null;
    href = href.replace(param, encodeURIComponent(value));
  }
  return href;
}

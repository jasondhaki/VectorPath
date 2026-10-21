import { Compass } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_ITEMS, resolveHref, visibleItems, type NavItem } from "@/components/layout/nav-items";
import { FEATURES } from "@/lib/config/features";
import { LoadingState } from "@/components/shared/state-panel";
import NotFound from "@/app/not-found";

const item = (over: Partial<NavItem>): NavItem => ({ key: "x", label: "X", icon: Compass, path: null, built: false, sidebar: true, mobile: "bar", ...over });

describe("nav items", () => {
  it("unbuilt items never resolve to a link", () => {
    for (const i of NAV_ITEMS) expect(resolveHref(i, { profileId: "p1", country: "GB" })).toBeNull();
  });

  it("built items substitute params and need the context they reference", () => {
    const skills = item({ path: "/p/[profileId]/skills", built: true });
    expect(resolveHref(skills, { profileId: "a b", country: null })).toBe("/p/a%20b/skills");
    expect(resolveHref(skills, { profileId: null, country: null })).toBeNull();
    expect(resolveHref(item({ path: "/market/[country]", built: true }), { profileId: null, country: "BD" })).toBe("/market/BD");
    expect(resolveHref(item({ path: "/methodology", built: true }), { profileId: null, country: null })).toBe("/methodology");
  });

  it("hides feature-flagged items while their flag is off", () => {
    const off = Object.fromEntries(Object.keys(FEATURES).map((k) => [k, false])) as Record<keyof typeof FEATURES, boolean>;
    expect(visibleItems(NAV_ITEMS, off).map((i) => i.key)).toEqual(["overview", "skills", "roles", "plan", "methodology"]);
    expect(visibleItems(NAV_ITEMS, { ...off, paths: true }).map((i) => i.key)).toContain("paths");
  });

  it("sidebar keeps ui-context order and bottom bar holds Overview, Roles, Plan, Paths", () => {
    expect(NAV_ITEMS.filter((i) => i.sidebar).map((i) => i.label)).toEqual(["Overview", "Skills", "Opportunities", "Paths", "Compare a job", "Market", "Methodology"]);
    expect(NAV_ITEMS.filter((i) => i.mobile === "bar").map((i) => i.shortLabel ?? i.label)).toEqual(["Overview", "Roles", "Plan", "Paths"]);
  });
});

describe("AppShell markup", () => {
  const html = renderToStaticMarkup(createElement(AppShell, null, createElement("p", null, "body")));

  it("has a skip link to a focusable main landmark", () => {
    expect(html).toContain('href="#main"');
    expect(html).toMatch(/<main id="main" tabindex="-1"/);
    expect(html).toContain("<p>body</p>");
  });

  it("renders unavailable destinations as non-links with an accessible reason", () => {
    expect(html).not.toMatch(/href="\/p\//);
    expect(html).not.toContain('href="/methodology"');
    expect(html).toContain("(not available yet)");
    expect(html).not.toContain("aria-disabled");
    expect(html).not.toMatch(/title="[^"]*not available yet/); // one announcement, not two
    expect(html).toMatch(/aria-hidden="true"[^>]*>Overview: not available yet</); // visual-only rail tooltip
  });

  it("states the absence of a profile instead of inventing one", () => {
    expect(html).toContain("No active profile");
  });

  it("shows profile, country and coverage when a profile is supplied", () => {
    const withProfile = renderToStaticMarkup(
      createElement(AppShell, { profile: { id: "p1", label: "Synthetic profile", country: "BD", coverage: "Job ads unavailable" } }),
    );
    expect(withProfile).toContain("Synthetic profile");
    expect(withProfile).toContain("BD");
    expect(withProfile).toContain("Job ads unavailable");
  });

  it("renders the mobile menu as a named modal dialog with a nav landmark", () => {
    expect(html).toMatch(/<dialog[^>]*aria-labelledby="vp-nav-menu-title"/);
    expect(html).toContain('id="vp-nav-menu-title"');
    expect(html).toContain('aria-label="More"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toMatch(/popover(target)?="/i);
  });
});

describe("state panels", () => {
  it("default to h2 and render h1 when used as a route boundary", () => {
    expect(renderToStaticMarkup(createElement(LoadingState))).toMatch(/<h2[^>]*>Loading<\/h2>/);
    expect(renderToStaticMarkup(createElement(LoadingState, { headingLevel: 1 }))).toMatch(/<h1[^>]*>Loading<\/h1>/);
    expect(renderToStaticMarkup(createElement(NotFound))).toMatch(/<h1[^>]*>Page not found<\/h1>/);
  });
});

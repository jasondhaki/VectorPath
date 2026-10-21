import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_NAME } from "@/lib/config/site";
import { cn } from "@/lib/utils";
import { MobileMenu } from "./mobile-menu";
import { NAV_ITEMS, resolveHref, visibleItems, type NavItem, type ShellContext } from "./nav-items";

export interface ShellProfile {
  /** Display name of the active profile, e.g. a persona name or "Your profile". */
  label: string;
  country: string;
  /** Short coverage status supplied by the caller from real data, e.g. "Job ads unavailable". */
  coverage: string;
}

interface AppShellProps {
  children?: ReactNode;
  profile?: (ShellProfile & { id: string }) | null;
}

// ui-context §4: <768 bottom bar + menu; 768–1279 collapsed icon rail; ≥1280 full 240 px sidebar; 56 px topbar.
export function AppShell({ children, profile = null }: AppShellProps) {
  const ctx: ShellContext = { profileId: profile?.id ?? null, country: profile?.country ?? null };
  const items = visibleItems(NAV_ITEMS);
  const barItems = items.filter((i) => i.mobile === "bar");
  const menuItems = items.filter((i) => i.mobile === "menu");
  const hasUnavailable = items.some((i) => resolveHref(i, ctx) === null);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[4rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 items-center border-b border-border px-3 xl:px-4">
          <Brand compact />
        </div>
        {/* No overflow clipping here: rail tooltips extend past the 64 px column. Seven items fit any viewport. */}
        <nav aria-label="Main" className="flex-1 p-2">
          <ul className="flex flex-col gap-1">
            {items.filter((i) => i.sidebar).map((item) => (
              <li key={item.key}>
                <NavEntry item={item} href={resolveHref(item, ctx)} variant="sidebar" />
              </li>
            ))}
          </ul>
        </nav>
        {hasUnavailable && (
          <p className="hidden border-t border-border p-4 text-xs font-medium text-muted-foreground xl:block">
            Dimmed items are not available yet.
          </p>
        )}
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background px-4 md:px-6">
          <div className="md:hidden">
            <Brand />
          </div>
          <ProfileStatus profile={profile} />
          <MobileMenu>
            <nav aria-label="More">
              <ul className="flex flex-col gap-1">
                {menuItems.map((item) => (
                  <li key={item.key}>
                    <NavEntry item={item} href={resolveHref(item, ctx)} variant="menu" />
                  </li>
                ))}
              </ul>
            </nav>
            {hasUnavailable && <p className="mt-3 text-xs font-medium text-muted-foreground">Dimmed items are not available yet.</p>}
          </MobileMenu>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          {children}
        </main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card md:hidden">
        <ul className="flex">
          {barItems.map((item) => (
            <li key={item.key} className="flex-1">
              <NavEntry item={item} href={resolveHref(item, ctx)} variant="bar" />
            </li>
          ))}
        </ul>
      </nav>

    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-md font-heading text-lg font-semibold tracking-tight">
      <span aria-hidden className="size-3 shrink-0 rounded-full bg-primary" />
      <span className={cn(compact && "sr-only xl:not-sr-only")}>{SITE_NAME}</span>
    </Link>
  );
}

function ProfileStatus({ profile }: { profile: ShellProfile | null }) {
  if (!profile) return <p className="truncate text-sm text-muted-foreground">No active profile</p>;
  return (
    <dl className="flex min-w-0 items-center gap-x-4 text-sm">
      <div className="flex min-w-0 gap-1">
        <dt className="sr-only">Profile</dt>
        <dd className="truncate font-medium">{profile.label}</dd>
      </div>
      <div className="flex gap-1">
        <dt className="text-muted-foreground">Country</dt>
        <dd className="font-medium">{profile.country}</dd>
      </div>
      <div className="hidden min-w-0 gap-1 lg:flex">
        <dt className="text-muted-foreground">Coverage</dt>
        <dd className="truncate text-foreground-secondary">{profile.coverage}</dd>
      </div>
    </dl>
  );
}

const VARIANT = {
  sidebar: "min-h-11 gap-3 px-3 justify-center xl:justify-start",
  bar: "min-h-16 flex-col justify-center gap-1 px-1 text-xs",
  menu: "min-h-11 gap-3 px-3",
} as const;

function NavEntry({ item, href, variant }: { item: NavItem; href: string | null; variant: keyof typeof VARIANT }) {
  const Icon = item.icon;
  const label = variant === "bar" ? (item.shortLabel ?? item.label) : item.label;
  const base = cn("group relative flex w-full items-center rounded-md font-heading font-medium", variant !== "bar" && "text-sm", VARIANT[variant]);
  const text = <span className={cn(variant === "sidebar" && "sr-only xl:not-sr-only")}>{label}</span>;
  // Visual-only rail tooltip (768–1279 px); screen readers already get the label and the sr-only reason.
  const railTip = variant === "sidebar" && (
    <span
      aria-hidden
      className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground group-hover:block xl:group-hover:hidden"
    >
      {href ? item.label : `${item.label}: not available yet`}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className={cn(base, "text-foreground-secondary hover:bg-raised hover:text-foreground")}>
        <Icon aria-hidden className="size-5 shrink-0" />
        {text}
        {railTip}
      </Link>
    );
  }
  // One announcement: label + sr-only reason. No title (duplicate) and no aria-disabled (no effect on a generic span).
  return (
    <span className={cn(base, "cursor-not-allowed text-muted-foreground")}>
      <Icon aria-hidden className="size-5 shrink-0" />
      {text}
      <span className="sr-only"> (not available yet)</span>
      {railTip}
    </span>
  );
}

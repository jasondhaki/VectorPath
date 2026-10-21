import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeadingLevel = 1 | 2 | 3;

export interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  /** Why this state occurred, in plain language. */
  reason: ReactNode;
  /** The appropriate next step (link or button). */
  action?: ReactNode;
  role?: "status" | "alert";
  /** 1 when the panel is the whole route (loading/error/not-found boundaries); 2 when nested in a page. */
  headingLevel?: HeadingLevel;
  iconClassName?: string;
  className?: string;
}

/** Shared frame for loading/empty/error/unavailable/stale states (ui-context §5): icon + title + reason + action. */
export function StatePanel({ icon: Icon, title, reason, action, role, headingLevel = 2, iconClassName, className }: StatePanelProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <section role={role} className={cn("flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-6", className)}>
      <div className="flex items-center gap-2">
        <Icon aria-hidden className={cn("size-5 shrink-0 text-muted-foreground", iconClassName)} />
        <Heading className="text-xl font-semibold">{title}</Heading>
      </div>
      <div className="max-w-[68ch] text-base leading-relaxed text-foreground-secondary">{reason}</div>
      {action && <div className="flex flex-wrap gap-3">{action}</div>}
    </section>
  );
}

export function LoadingState({
  title = "Loading",
  reason = "Fetching the latest recorded data.",
  headingLevel = 2,
}: { title?: string; reason?: string; headingLevel?: HeadingLevel }) {
  return (
    <StatePanel
      role="status"
      headingLevel={headingLevel}
      icon={LoaderCircle}
      iconClassName="animate-spin"
      title={title}
      reason={reason}
    />
  );
}

/** Token-styled action classes for state-panel next steps (links or buttons). */
export const stateActionClass =
  "inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover";
export const stateSecondaryActionClass =
  "inline-flex min-h-11 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-raised";

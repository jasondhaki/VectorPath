import type { ReactNode } from "react";
import { CloudOff, History } from "lucide-react";
import { StatePanel, type HeadingLevel } from "./state-panel";

/** Data is not available from any permitted source (e.g. no Bangladesh job-ad source). Missing is not zero. */
export function UnavailableState({
  title,
  reason,
  action,
  headingLevel = 2,
}: { title: string; reason: ReactNode; action?: ReactNode; headingLevel?: HeadingLevel }) {
  return <StatePanel icon={CloudOff} title={title} reason={reason} action={action} headingLevel={headingLevel} />;
}

/**
 * Data shown is an older recorded snapshot. `recordedOn` is the original source date, already formatted
 * with a written month (e.g. "12 Oct 2026"); it must never be replaced by the fetch-retry time.
 */
export function StaleState({ recordedOn, reason, action }: { recordedOn: string; reason: ReactNode; action?: ReactNode }) {
  return (
    <StatePanel
      icon={History}
      title="Cached snapshot"
      reason={
        <>
          <p>Recorded {recordedOn}.</p>
          <div>{reason}</div>
        </>
      }
      action={action}
    />
  );
}

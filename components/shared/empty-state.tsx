import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { StatePanel, type HeadingLevel } from "./state-panel";

/** Nothing exists yet for this owner (e.g. no profile, no confirmed skills). Always offers a next step. */
export function EmptyState({ title, reason, action, headingLevel = 2 }: { title: string; reason: ReactNode; action: ReactNode; headingLevel?: HeadingLevel }) {
  return <StatePanel icon={Inbox} title={title} reason={reason} action={action} headingLevel={headingLevel} />;
}

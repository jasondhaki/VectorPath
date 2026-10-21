import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { StatePanel, type HeadingLevel } from "./state-panel";

/** Something failed. Never shows stack traces or provider payloads; offers a safe next step. */
export function ErrorState({
  title = "Something went wrong",
  reason,
  action,
  headingLevel = 2,
}: { title?: string; reason: ReactNode; action: ReactNode; headingLevel?: HeadingLevel }) {
  return <StatePanel role="alert" icon={TriangleAlert} iconClassName="text-destructive" title={title} reason={reason} action={action} headingLevel={headingLevel} />;
}

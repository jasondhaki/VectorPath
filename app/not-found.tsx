import Link from "next/link";
import { UnavailableState } from "@/components/shared/no-data-state";
import { stateSecondaryActionClass } from "@/components/shared/state-panel";

export default function NotFound() {
  return (
    <UnavailableState
      headingLevel={1}
      title="Page not found"
      reason="This page does not exist or is not available yet."
      action={
        <Link href="/" className={stateSecondaryActionClass}>
          Go to start
        </Link>
      }
    />
  );
}

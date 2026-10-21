"use client";

import Link from "next/link";
import { ErrorState } from "@/components/shared/error-state";
import { stateActionClass, stateSecondaryActionClass } from "@/components/shared/state-panel";

// Safe failure boundary: never renders error.message (it may carry server or provider detail).
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      headingLevel={1}
      reason="This page could not be shown. Try again or return to the start."
      action={
        <>
          <button type="button" onClick={reset} className={stateActionClass}>
            Try again
          </button>
          <Link href="/" className={stateSecondaryActionClass}>
            Go to start
          </Link>
        </>
      }
    />
  );
}

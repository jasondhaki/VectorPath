import { notFound } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StaleState, UnavailableState } from "@/components/shared/no-data-state";
import { LoadingState, stateActionClass, stateSecondaryActionClass } from "@/components/shared/state-panel";

// Development-only gallery for in-browser QA of shared states. Not found in production builds.
export default function ComponentGallery() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Component gallery</h1>
        <p className="mt-2 text-sm text-muted-foreground">Development only. All copy and dates below are synthetic examples.</p>
      </div>
      <LoadingState />
      <EmptyState
        title="No profile yet"
        reason="Upload a CV or enter skills to see opportunities."
        action={<button type="button" className={stateActionClass}>Enter skills manually</button>}
      />
      <ErrorState
        reason="Text could not be read from this file."
        action={<button type="button" className={stateSecondaryActionClass}>Enter skills instead</button>}
      />
      <UnavailableState title="Job ads unavailable" reason="No job-ad source is configured for Bangladesh." />
      <StaleState recordedOn="12 Oct 2026" reason="Synthetic example of a cached snapshot label." />
    </div>
  );
}

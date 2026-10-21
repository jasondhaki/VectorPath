import { LoadingState } from "@/components/shared/state-panel";

export default function Loading() {
  return <LoadingState headingLevel={1} reason="Preparing this page." />;
}

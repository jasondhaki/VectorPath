import { SITE_NAME } from "@/lib/config/site";

export default function HomePage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">{SITE_NAME}</h1>
      <p className="mt-4 text-muted-foreground">Scaffold only. Product features are not built yet.</p>
    </div>
  );
}

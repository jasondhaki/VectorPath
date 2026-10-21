export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ data: { status: "ok" } }, { headers: { "Cache-Control": "no-store" } });
}

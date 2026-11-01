import { getDataset } from "@/lib/server/supabase";

/** The verified dataset from Supabase. 204 when it isn't available, so the client uses /data. */
export async function GET() {
  const data = await getDataset();
  if (!data) return new Response(null, { status: 204 });
  return Response.json(data, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=86400" } });
}

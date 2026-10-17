import { requireUser } from "@/lib/supabase/server";
import { ingestBatch } from "@/lib/ingest";
import { IngestBatchSchema } from "@/lib/ai/schemas";
import { jsonError, readJSON, routeError } from "@/lib/http";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const parsed = IngestBatchSchema.safeParse(await readJSON(req));
  if (!parsed.success) {
    return jsonError(400, "That batch of pages didn't look right. Please try uploading again.");
  }

  try {
    return Response.json(await ingestBatch(auth, parsed.data.courseId, parsed.data.pages));
  } catch (err) {
    return routeError(err, "ingest");
  }
}

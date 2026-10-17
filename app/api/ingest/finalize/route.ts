import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { finalizeCourse } from "@/lib/ingest";
import { jsonError, readJSON, routeError } from "@/lib/http";

export const maxDuration = 120;

const FinalizeSchema = z.object({ courseId: z.uuid() });

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const parsed = FinalizeSchema.safeParse(await readJSON(req));
  if (!parsed.success) return jsonError(400, "Missing course.");

  try {
    return Response.json(await finalizeCourse(auth, parsed.data.courseId));
  } catch (err) {
    return routeError(err, "ingest/finalize");
  }
}

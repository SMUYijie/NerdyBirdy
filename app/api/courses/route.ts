import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { createCourse } from "@/lib/ingest";
import { jsonError, readJSON, routeError } from "@/lib/http";
import { LIMITS } from "@/lib/ai/schemas";

const CreateCourseSchema = z.object({
  name: z.string().trim().min(1).max(LIMITS.maxCourseNameChars),
  examDate: z.iso.date().nullable(),
  pageCount: z.number().int().min(1).max(LIMITS.maxPages),
});

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const parsed = CreateCourseSchema.safeParse(await readJSON(req));
  if (!parsed.success) {
    return jsonError(400, "Please give your course a name (up to 120 characters).");
  }

  try {
    return Response.json(await createCourse(auth, parsed.data));
  } catch (err) {
    return routeError(err, "courses");
  }
}

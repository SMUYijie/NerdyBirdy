import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { getStudyNotes } from "@/lib/topic-notes";
import { jsonError, readJSON, routeError } from "@/lib/http";

export const maxDuration = 120;

const NotesRequestSchema = z.object({ topicId: z.uuid() });

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const parsed = NotesRequestSchema.safeParse(await readJSON(req));
  if (!parsed.success) return jsonError(400, "Missing topic.");

  try {
    return Response.json(await getStudyNotes(auth, parsed.data.topicId));
  } catch (err) {
    return routeError(err, "topic-notes");
  }
}

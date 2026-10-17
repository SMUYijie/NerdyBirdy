import { requireUser } from "@/lib/supabase/server";
import { nextQuestion, NextRequestSchema } from "@/lib/quiz/next";
import { jsonError, readJSON, routeError } from "@/lib/http";

// Generate + verify can take several model calls.
export const maxDuration = 300;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const parsed = NextRequestSchema.safeParse(await readJSON(req));
  if (!parsed.success) return jsonError(400, "Pick a topic and a question type first.");

  try {
    return Response.json(await nextQuestion(auth, parsed.data));
  } catch (err) {
    return routeError(err, "quiz/next");
  }
}

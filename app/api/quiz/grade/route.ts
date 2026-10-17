import { requireUser } from "@/lib/supabase/server";
import { gradeAnswer, parseGradeRequest } from "@/lib/quiz/grade";
import { jsonError, readJSON, routeError } from "@/lib/http";

export const maxDuration = 120;

export async function POST(req: Request) {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;

  const parsed = parseGradeRequest(await readJSON(req));
  if (!parsed.ok) return jsonError(400, parsed.message);

  try {
    return Response.json(await gradeAnswer(auth, parsed.data));
  } catch (err) {
    return routeError(err, "quiz/grade");
  }
}

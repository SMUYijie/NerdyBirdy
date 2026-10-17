import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const COURSE_RETENTION_DAYS = 7;
const LOG_RETENTION_DAYS = 30;

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

// Daily (vercel.json). Vercel sends `Authorization: Bearer <CRON_SECRET>`.
// 1. One small query keeps the free Supabase project from pausing.
// 2. Deletes courses older than 7 days (pages, chunks, topics, questions,
//    keys and attempts cascade).
// 3. Trims old usage counters and course-less safety events.
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { error: pingError } = await admin.from("courses").select("id", { head: true, count: "exact" });
  if (pingError) {
    console.error("[cron] ping failed", pingError.code);
    return Response.json({ ok: false }, { status: 500 });
  }

  const { data: deleted, error: deleteError } = await admin
    .from("courses")
    .delete()
    .lt("created_at", daysAgo(COURSE_RETENTION_DAYS).toISOString())
    .select("id");
  if (deleteError) {
    console.error("[cron] course cleanup failed", deleteError.code);
    return Response.json({ ok: false }, { status: 500 });
  }

  const logCutoff = daysAgo(LOG_RETENTION_DAYS);
  await admin.from("usage").delete().lt("day", logCutoff.toISOString().slice(0, 10));
  await admin.from("safety_events").delete().lt("created_at", logCutoff.toISOString());

  return Response.json({ ok: true, deletedCourses: deleted?.length ?? 0 });
}

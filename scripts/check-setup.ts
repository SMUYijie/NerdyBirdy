// Run with: npm run check-setup
// Prints ok/fail per check. Never prints secret values.
import { createAdminClient } from "@/lib/supabase/admin";
import { callJSON, embedOne, EMBED_DIMENSIONS, LLMError, models, getResolvedVariants } from "@/lib/ai/openrouter";
import { PingSchema } from "@/lib/ai/schemas";

const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "OPENROUTER_API_KEY",
  "MODEL_PROFESSOR",
  "MODEL_CHECKER",
  "MODEL_EMBED",
  "CRON_SECRET",
];

let failures = 0;

// Errors we throw ourselves carry a safe, human-readable message.
class SetupError extends Error {}

function report(name: string, ok: boolean, note = "") {
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${note ? `  (${note})` : ""}`);
}

// Only short, non-secret descriptions of errors.
function describe(err: unknown): string {
  if (err instanceof LLMError) return `${err.code}: ${err.message}`;
  if (err instanceof SetupError) return err.message;
  if (err && typeof err === "object" && "status" in err) return `HTTP ${(err as { status: unknown }).status}`;
  if (err instanceof Error) return err.name;
  return "unknown error";
}

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const note = await fn();
    report(name, true, note ?? "");
  } catch (err) {
    report(name, false, describe(err));
  }
}

async function main() {
  console.log("NerdyBirdy setup check\n");

  const missing = REQUIRED_ENV.filter((n) => !process.env[n]);
  report("env vars present", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : "");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const urlOk = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url);
  report(
    "Supabase URL format",
    urlOk,
    urlOk ? "" : "expected exactly https://<project-ref>.supabase.co, with no path or trailing slash",
  );

  await check("Supabase reachable", async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "" },
    });
    if (!res.ok) throw Object.assign(new Error("health"), { status: res.status });
  });

  await check("Supabase secret key works", async () => {
    const { error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw Object.assign(new Error("auth"), { status: error.status });
  });

  await check("Database schema (0001_init.sql)", async () => {
    const admin = createAdminClient();
    const { error } = await admin.from("courses").select("id", { head: true, count: "exact" });
    if (error) throw new SetupError("courses table missing — run supabase/migrations/0001_init.sql");
    const { error: rpcError } = await admin.rpc("bump_usage", { p_key: "setup-check", p_limit: 1_000_000 });
    if (rpcError) throw new SetupError("bump_usage missing — run supabase/migrations/0001_init.sql");
  });

  await check("OpenRouter chat (MODEL_PROFESSOR)", async () => {
    const out = await callJSON({
      model: models.professor(),
      system: "You are a health check. Reply with JSON.",
      user: 'Reply with {"ok": true}.',
      schema: PingSchema,
      temperature: 0,
      name: "ping",
      maxTokens: 50,
    });
    if (!out.ok) throw new SetupError("model replied ok=false");
    const v = getResolvedVariants()[models.professor()];
    return v ? `mode: ${v.mode}${v.reasoning ? " + reasoning low" : ", reasoning param not supported"}` : "";
  });

  await check("OpenRouter chat (MODEL_CHECKER)", async () => {
    const out = await callJSON({
      model: models.checker(),
      system: "You are a health check. Reply with JSON.",
      user: 'Reply with {"ok": true}.',
      schema: PingSchema,
      temperature: 0,
      name: "ping",
      maxTokens: 300,
    });
    if (!out.ok) throw new SetupError("model replied ok=false");
    const v = getResolvedVariants()[models.checker()];
    return v ? `mode: ${v.mode}${v.reasoning ? " + reasoning low" : ", reasoning param not supported"}` : "";
  });

  await check(`OpenRouter embedding (${EMBED_DIMENSIONS} dims)`, async () => {
    const vector = await embedOne("Photosynthesis turns light energy into chemical energy.");
    return `${vector.length} dims`;
  });

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.log(`FAIL  unexpected (${describe(err)})`);
  process.exit(1);
});
